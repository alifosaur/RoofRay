import io
import os
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
import jwt
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.order import Order, OrderStatus
from app.models.payment import Payment
from app.models.job import InstallationJob, JobStatus
from app.models.lead import Lead, LeadStatus
from app.models.survey import Survey, SurveyStatus
from app.models.ticket import Ticket, TicketStatus
from app.models.product import Product, ProductCategory
from app.models.quote import Quote
from app.models.finance import SubsidyRecord, SubsidyStatus, TechnicianPayout
from app.models.inventory import StockMovement, MovementType
from app.models.job import Timesheet
from app.models.expense import Expense
from app.models.quote import QuoteStatus
from app.core import cache


def get_date_filter_range(date_range: str):
    now = datetime.utcnow()
    if date_range == "today":
        start = datetime(now.year, now.month, now.day)
        return start, now
    elif date_range == "this_week":
        start = now - timedelta(days=now.weekday())
        start = datetime(start.year, start.month, start.day)
        return start, now
    elif date_range == "this_month":
        start = datetime(now.year, now.month, 1)
        return start, now
    # default all time
    return datetime(2020, 1, 1), now


def _order_date(order: Order) -> datetime:
    return order.confirmed_at or order.created_at


def _orders_in_range(db: Session, start_dt: datetime, end_dt: datetime) -> List[Order]:
    """Non-draft orders whose confirmation (sale) date falls in the range."""
    orders = db.query(Order).filter(Order.status != OrderStatus.DRAFT).all()
    return [o for o in orders if start_dt <= _order_date(o) <= end_dt]


def calculate_profit_per_job(db: Session, date_range: str = "this_month") -> List[Dict[str, Any]]:
    """Revenue minus BOM stock cost minus technician pay (timesheet) minus recorded job expenses."""
    start_dt, end_dt = get_date_filter_range(date_range)
    orders = sorted(_orders_in_range(db, start_dt, end_dt), key=lambda o: o.id, reverse=True)
    expenses_by_order: Dict[int, float] = {}
    for e in db.query(Expense).filter(Expense.order_id.isnot(None)).all():
        expenses_by_order[e.order_id] = expenses_by_order.get(e.order_id, 0.0) + e.amount

    breakdowns = []
    for order in orders:
        revenue = order.total_amount
        stock_cost = 0.0
        bom_items = []
        for ql in (order.quote.lines if order.quote else []):
            u_cost = ql.product.cost_price if ql.product else 0.0
            stock_cost += ql.quantity * u_cost
            bom_items.append({
                "product_name": ql.product.name if ql.product else f"Product #{ql.product_id}",
                "sku": ql.product.sku if ql.product else "",
                "category": ql.product.category.value if ql.product else "",
                "quantity": ql.quantity,
                "unit_cost": u_cost,
                "unit_price": ql.unit_price,
                "total_cost": round(ql.quantity * u_cost, 2),
                "total_price": round(ql.quantity * ql.unit_price, 2),
                "warranty_years": ql.product.warranty_years if ql.product else 0,
            })

        job = order.installation_job
        timesheet = job.timesheet if job else None
        tech_cost = timesheet.total_cost if timesheet else 0.0
        tech_hours = timesheet.hours if timesheet else 0.0
        other_costs = round(expenses_by_order.get(order.id, 0.0), 2)
        total_costs = round(stock_cost + tech_cost + other_costs, 2)
        net_profit = round(revenue - total_costs, 2)
        margin_pct = round((net_profit / revenue * 100), 1) if revenue > 0 else 0.0

        breakdowns.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "customer_name": order.customer.name if order.customer else None,
            "customer_phone": order.customer.phone if order.customer else None,
            "customer_email": order.customer.email if order.customer else None,
            "customer_address": order.customer.address if order.customer else None,
            "customer_city": order.customer.city if order.customer else None,
            "customer_pincode": order.customer.pincode if order.customer else None,
            "capacity_kw": order.quote.template.capacity_kw if (order.quote and order.quote.template) else None,
            "system_type": order.quote.template.system_type if (order.quote and order.quote.template) else None,
            "revenue": revenue,
            "paid_amount": order.paid_amount,
            "pending_amount": max(0.0, revenue - order.paid_amount),
            "stock_cost": round(stock_cost, 2),
            "technician_cost": tech_cost,
            "technician_hours": tech_hours,
            "technician_name": job.technician.full_name if (job and job.technician) else None,
            "other_costs": other_costs,
            "total_costs": total_costs,
            "net_profit": net_profit,
            "profit": net_profit,
            "margin_pct": margin_pct,
            "profit_margin_percent": margin_pct,
            "is_profitable": net_profit > 0,
            "order_status": order.status.value,
            "job_status": job.status.value if job else None,
            "created_at": _order_date(order).strftime("%Y-%m-%d"),
            "bom_items": bom_items,
            "serials": [
                {
                    "serial_number": si.serial_no,
                    "product_name": si.product.name if si.product else "",
                    "status": si.status.value,
                    "scanned_at": si.scanned_at.strftime("%Y-%m-%d %H:%M") if si.scanned_at else None,
                    "warranty_start_date": si.delivered_on.strftime("%Y-%m-%d") if si.delivered_on else None,
                    "warranty_end_date": si.warranty_end.strftime("%Y-%m-%d") if si.warranty_end else None,
                }
                for si in order.serial_items
            ],
            "subsidy": {
                "status": order.subsidy_record.status.value,
                "sanctioned_amount": order.subsidy_record.sanctioned_amount or 0.0,
                "application_ref": order.subsidy_record.application_no,
            } if order.subsidy_record else None,
        })
    return breakdowns


def _bucket_key(dt: datetime, granularity: str) -> str:
    if granularity == "month":
        return dt.strftime("%Y-%m")
    if granularity == "week":
        monday = dt - timedelta(days=dt.weekday())
        return monday.strftime("%Y-%m-%d")
    return dt.strftime("%Y-%m-%d")


def _compute_director_metrics(db: Session, date_range: str, granularity: str) -> Dict[str, Any]:
    start_dt, end_dt = get_date_filter_range(date_range)
    in_range = lambda dt: dt is not None and start_dt <= dt <= end_dt

    jobs = calculate_profit_per_job(db, date_range)
    total_revenue = round(sum(j["revenue"] for j in jobs), 2)
    total_profit = round(sum(j["net_profit"] for j in jobs), 2)

    payments = [p for p in db.query(Payment).all() if in_range(p.created_at)]
    purchases = [m for m in db.query(StockMovement).filter(StockMovement.movement_type == MovementType.PURCHASE).all() if in_range(m.created_at)]
    timesheets = [t for t in db.query(Timesheet).all() if in_range(t.finish_time)]
    expenses = [e for e in db.query(Expense).all() if in_range(datetime.combine(e.expense_date, datetime.min.time()))]

    received = round(sum(p.amount for p in payments), 2)
    stock_spend = round(sum(m.quantity * m.unit_cost for m in purchases), 2)
    tech_spend = round(sum(t.total_cost for t in timesheets), 2)
    other_spend = round(sum(e.amount for e in expenses), 2)

    open_orders = db.query(Order).filter(Order.status != OrderStatus.DRAFT).all()
    pending = round(sum(max(0.0, o.total_amount - o.paid_amount) for o in open_orders), 2)

    payouts = db.query(TechnicianPayout).all()
    payouts_unpaid = round(sum(p.total_amount for p in payouts if not p.is_paid), 2)
    payouts_paid = round(sum(p.total_amount for p in payouts if p.is_paid and in_range(p.paid_at)), 2)

    # Time series (only buckets that have data; the chart shows an empty state when there are none)
    series: Dict[str, Dict[str, float]] = {}

    def add(dt: datetime, field: str, amount: float):
        b = series.setdefault(_bucket_key(dt, granularity), {"revenue": 0.0, "received": 0.0, "spent": 0.0, "profit": 0.0})
        b[field] = round(b[field] + amount, 2)

    for j in jobs:
        dt = datetime.strptime(j["created_at"], "%Y-%m-%d")
        add(dt, "revenue", j["revenue"])
        add(dt, "profit", j["net_profit"])
    for p in payments:
        add(p.created_at, "received", p.amount)
    for m in purchases:
        add(m.created_at, "spent", m.quantity * m.unit_cost)
    for t in timesheets:
        add(t.finish_time, "spent", t.total_cost)
    for e in expenses:
        add(datetime.combine(e.expense_date, datetime.min.time()), "spent", e.amount)
    profit_series = [{"period": k, **v} for k, v in sorted(series.items())]

    unfinished_by_stage = {
        "new_leads": db.query(Lead).filter(Lead.status == LeadStatus.NEW, Lead.is_deleted == False).count(),
        "contacted_leads": db.query(Lead).filter(Lead.status.in_([LeadStatus.CONTACTED, LeadStatus.QUALIFIED]), Lead.is_deleted == False).count(),
        "surveys_scheduled": db.query(Survey).filter(Survey.status == SurveyStatus.SCHEDULED).count(),
        "surveys_awaiting_approval": db.query(Survey).filter(Survey.status == SurveyStatus.COMPLETED).count(),
        "quotes_open": db.query(Quote).filter(Quote.status.in_([QuoteStatus.DRAFT, QuoteStatus.SENT])).count(),
        "orders_awaiting_confirmation": db.query(Order).filter(Order.status == OrderStatus.DRAFT).count(),
    }
    for st in (OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.PACKED, OrderStatus.DISPATCHED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED):
        unfinished_by_stage[f"orders_{st.value.lower()}"] = db.query(Order).filter(Order.status == st).count()
    unfinished_by_stage["installs_in_progress"] = db.query(InstallationJob).filter(InstallationJob.status == JobStatus.IN_PROGRESS).count()

    open_tickets = db.query(Ticket).filter(Ticket.status.in_([TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED])).count()
    subsidy_counts = {st.value: db.query(SubsidyRecord).filter(SubsidyRecord.status == st).count() for st in SubsidyStatus}
    low_stock = db.query(Product).filter(Product.category != ProductCategory.SERVICE, Product.stock_quantity <= Product.min_stock_alert).all()

    return {
        "date_range": date_range,
        "granularity": granularity,
        "generated_at": datetime.utcnow().isoformat(),
        "revenue": total_revenue,
        "total_revenue": total_revenue,
        "money_received": received,
        "collected_revenue": received,
        "collected_payments": received,
        "pending_revenue": pending,
        "pending_payments": pending,
        "money_spent": round(stock_spend + tech_spend + other_spend, 2),
        "spend_breakdown": {"stock_purchases": stock_spend, "technician_pay": tech_spend, "other_costs": other_spend},
        "technician_payouts": {"unpaid": payouts_unpaid, "paid_in_period": payouts_paid},
        "net_profit": total_profit,
        "profit_margin_percent": round(total_profit / total_revenue * 100, 1) if total_revenue > 0 else 0.0,
        "profitable_jobs_count": sum(1 for j in jobs if j["is_profitable"]),
        "loss_making_jobs_count": sum(1 for j in jobs if not j["is_profitable"]),
        "profit_series": profit_series,
        "unfinished_by_stage": unfinished_by_stage,
        "unfinished_jobs_by_stage": unfinished_by_stage,
        "open_tickets_count": open_tickets,
        "subsidy_pipeline": subsidy_counts,
        "low_stock_count": len(low_stock),
        "low_stock_products_count": len(low_stock),
        "low_stock_items": [{"sku": p.sku, "name": p.name, "stock": p.stock_quantity, "min": p.min_stock_alert} for p in low_stock],
        "profit_per_job": jobs,
    }


def get_director_dashboard_metrics(db: Session, date_range: str = "this_month", granularity: str = "day") -> Dict[str, Any]:
    # Cached briefly; any hand-off event invalidates it (see app.core.events)
    return cache.cached(f"dash:director:{date_range}:{granularity}", 45,
                        lambda: _compute_director_metrics(db, date_range, granularity))


def export_dashboard_to_excel(db: Session) -> str:
    wb = Workbook()

    # Style definitions
    header_fill = PatternFill(start_color="714B67", end_color="714B67", fill_type="solid")
    header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    bold_font = Font(name="Arial", size=10, bold=True)
    regular_font = Font(name="Arial", size=10)
    thin_border = Border(
        left=Side(style='thin', color='E5E7EB'),
        right=Side(style='thin', color='E5E7EB'),
        top=Side(style='thin', color='E5E7EB'),
        bottom=Side(style='thin', color='E5E7EB')
    )

    # Sheet 1: Executive KPI Overview
    ws1 = wb.active
    ws1.title = "Executive Summary"
    metrics = get_director_dashboard_metrics(db, "all")

    ws1.append(["RoofRay Solutions - Executive Operations Summary"])
    ws1.merge_cells("A1:D1")
    ws1["A1"].font = Font(name="Arial", size=14, bold=True, color="714B67")
    ws1.append([])

    kpis = [
        ("Total Sales Revenue", f"₹ {metrics['revenue']:,.2f}"),
        ("Collected Customer Payments", f"₹ {metrics['collected_payments']:,.2f}"),
        ("Pending Payment Collections", f"₹ {metrics['pending_payments']:,.2f}"),
        ("Estimated Net Project Profit", f"₹ {metrics['net_profit']:,.2f}"),
        ("Profitable Projects", metrics['profitable_jobs_count']),
        ("Loss-Making Projects", metrics['loss_making_jobs_count']),
        ("Open Support Tickets", metrics['open_tickets_count']),
        ("Critical Low-Stock Items", metrics['low_stock_count']),
    ]

    for label, val in kpis:
        ws1.append([label, val])

    ws1.column_dimensions['A'].width = 32
    ws1.column_dimensions['B'].width = 24

    # Sheet 2: Profit Per Job Breakdown
    ws2 = wb.create_sheet(title="Profit Per Job")
    headers2 = ["Order Number", "Customer", "Capacity (kW)", "Revenue (₹)", "Stock Cost (₹)", "Labour Cost (₹)", "Other Cost (₹)", "Net Profit (₹)", "Margin %", "Status"]
    ws2.append(headers2)

    for col_num in range(1, len(headers2) + 1):
        cell = ws2.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font

    profit_jobs = calculate_profit_per_job(db, "all")
    for j in profit_jobs:
        ws2.append([
            j["order_number"],
            j["customer_name"],
            j["capacity_kw"],
            j["revenue"],
            j["stock_cost"],
            j["technician_cost"],
            j["other_costs"],
            j["net_profit"],
            f"{j['margin_pct']}%",
            j["order_status"],
        ])

    for col in ws2.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = col[0].column_letter
        ws2.column_dimensions[col_letter].width = max(max_len + 3, 12)

    export_dir = os.path.join(settings.UPLOAD_DIR, "reports")
    os.makedirs(export_dir, exist_ok=True)
    filename = f"RoofRay_Executive_Report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    file_path = os.path.join(export_dir, filename)
    wb.save(file_path)
    return file_path


def export_dashboard_to_pdf(db: Session, date_range: str = "this_month") -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    m = _compute_director_metrics(db, date_range, "day")
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=30, rightMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    inr = lambda v: f"Rs {v:,.2f}"
    story = [
        Paragraph(f"{settings.PROJECT_NAME} - Operations & Finance Report ({date_range.replace('_', ' ')})", styles["Title"]),
        Paragraph(f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC from live data", styles["Normal"]),
        Spacer(1, 12),
    ]
    kpis = [
        ["Revenue", inr(m["total_revenue"]), "Money received", inr(m["money_received"])],
        ["Money spent", inr(m["money_spent"]), "Pending payments", inr(m["pending_payments"])],
        ["Net profit (jobs)", inr(m["net_profit"]), "Unpaid technician payouts", inr(m["technician_payouts"]["unpaid"])],
        ["Open tickets", str(m["open_tickets_count"]), "Low stock SKUs", str(m["low_stock_count"])],
    ]
    t = Table(kpis, colWidths=[140, 140, 160, 140])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey), ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                           ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold")]))
    story += [t, Spacer(1, 16), Paragraph("Profit per job", styles["Heading2"])]
    rows = [["Order", "Customer", "Revenue", "Stock cost", "Technician pay", "Other", "Net profit", "Margin", "Status"]]
    for j in m["profit_per_job"]:
        rows.append([j["order_number"], j["customer_name"] or "", inr(j["revenue"]), inr(j["stock_cost"]), inr(j["technician_cost"]),
                     inr(j["other_costs"]), inr(j["net_profit"]), f"{j['margin_pct']}%", j["order_status"]])
    if len(rows) == 1:
        story.append(Paragraph("No confirmed orders in this period.", styles["Normal"]))
    else:
        jt = Table(rows, repeatRows=1)
        jt.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#714B67")),
                                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("FONTSIZE", (0, 0), (-1, -1), 8)]))
        story.append(jt)
    doc.build(story)
    return buf.getvalue()


def generate_share_token(expires_days: int = 7) -> str:
    payload = {
        "scope": "dashboard_readonly",
        "exp": datetime.utcnow() + timedelta(days=expires_days),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def verify_share_token(token: str) -> bool:
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return decoded.get("scope") == "dashboard_readonly"
    except Exception:
        return False


def get_sales_metrics(db: Session, sales_user_id: Optional[int] = None) -> Dict[str, Any]:
    return cache.cached(f"dash:sales:{sales_user_id or 'all'}", 45, lambda: _compute_sales_metrics(db, sales_user_id))


def _compute_sales_metrics(db: Session, sales_user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Sales executive metrics & commission tracker:
    Monthly conversion rate, pipeline value, average deal size, commission earned per deal.
    """
    leads_query = db.query(Lead).filter(Lead.is_deleted == False)
    if sales_user_id:
        leads_query = leads_query.filter(Lead.assigned_to_id == sales_user_id)

    all_leads = leads_query.all()
    total_leads = len(all_leads)
    won_leads = [l for l in all_leads if l.status == LeadStatus.WON]
    lost_leads = [l for l in all_leads if l.status == LeadStatus.LOST]
    active_leads = [l for l in all_leads if l.status not in (LeadStatus.WON, LeadStatus.LOST)]

    won_count = len(won_leads)
    lost_count = len(lost_leads)
    closed_count = won_count + lost_count
    conversion_rate = round((won_count / max(1, closed_count)) * 100, 1)

    # Pipeline value = value of quotes on active leads (unquoted leads have no value yet)
    pipeline_value = sum(l.quotes[-1].total_amount for l in active_leads if l.quotes)

    # Calculate won revenue and average deal size
    won_orders_query = db.query(Order).filter(Order.status != OrderStatus.DRAFT)
    if sales_user_id:
        lead_ids = [l.id for l in won_leads]
        won_orders_query = won_orders_query.join(Order.quote).filter(Quote.lead_id.in_(lead_ids))

    won_orders = won_orders_query.all()
    won_revenue = sum(o.total_amount for o in won_orders)
    avg_deal_size = round(won_revenue / max(1, len(won_orders)), 2)

    # Commission rate: 2.5% per completed/confirmed sale
    COMMISSION_RATE = 0.025
    commission_earned = round(won_revenue * COMMISSION_RATE, 2)

    deals = []
    for o in won_orders:
        comm = round(o.total_amount * COMMISSION_RATE, 2)
        deals.append({
            "order_number": o.order_number,
            "customer_name": o.customer.name if o.customer else "N/A",
            "capacity_kw": o.quote.template.capacity_kw if (o.quote and o.quote.template) else 3.0,
            "system_type": o.quote.template.system_type if (o.quote and o.quote.template) else "On-Grid",
            "deal_value": o.total_amount,
            "commission_rate": "2.5%",
            "commission_amount": comm,
            "status": o.status.value,
            "confirmed_at": o.confirmed_at.strftime("%Y-%m-%d") if o.confirmed_at else o.created_at.strftime("%Y-%m-%d"),
        })

    return {
        "total_leads": total_leads,
        "won_count": won_count,
        "lost_count": lost_count,
        "active_pipeline_count": len(active_leads),
        "conversion_rate_pct": conversion_rate,
        "pipeline_value": round(pipeline_value, 2),
        "total_won_revenue": round(won_revenue, 2),
        "average_deal_size": avg_deal_size,
        "commission_rate_pct": 2.5,
        "commission_earned": commission_earned,
        "deals": deals,
    }


