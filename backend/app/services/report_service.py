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
from app.models.product import Product
from app.models.quote import Quote
from app.models.finance import SubsidyRecord, SubsidyStatus


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


def calculate_profit_per_job(db: Session, date_range: str = "this_month") -> List[Dict[str, Any]]:
    start_dt, end_dt = get_date_filter_range(date_range)
    orders = db.query(Order).filter(Order.created_at >= start_dt, Order.created_at <= end_dt).order_by(Order.id.desc()).all()

    breakdowns = []
    for order in orders:
        revenue = order.total_amount

        # 1. Stock Cost (sum of BOM items cost price)
        stock_cost = 0.0
        bom_items = []
        if order.quote and order.quote.lines:
            for ql in order.quote.lines:
                u_cost = ql.product.cost_price if ql.product else 0.0
                stock_cost += ql.quantity * u_cost
                bom_items.append({
                    "product_name": ql.product.name if ql.product else f"Product #{ql.product_id}",
                    "sku": ql.product.sku if ql.product else "",
                    "category": ql.product.category.value if (ql.product and ql.product.category) else "HARDWARE",
                    "quantity": ql.quantity,
                    "unit_cost": u_cost,
                    "unit_price": ql.unit_price,
                    "total_cost": round(ql.quantity * u_cost, 2),
                    "total_price": round(ql.quantity * ql.unit_price, 2),
                    "warranty_years": ql.product.warranty_years if ql.product else 0,
                })

        # 2. Technician Cost & Hours
        tech_cost = 0.0
        tech_hours = 0.0
        tech_name = "Not Assigned"
        job_status_val = "NOT_SCHEDULED"
        if order.installation_job:
            job_status_val = order.installation_job.status.value
            if order.installation_job.technician:
                tech_name = order.installation_job.technician.full_name
            if order.installation_job.timesheet:
                tech_cost = order.installation_job.timesheet.total_cost
                tech_hours = getattr(order.installation_job.timesheet, 'hours', 0.0)
            elif order.status in [OrderStatus.DELIVERED, OrderStatus.INSTALLED, OrderStatus.CLOSED]:
                # Standard crew timesheet estimate if completed
                tech_hours = 8.0
                tech_cost = 4800.0

        # 3. Other logistics / transport overhead (estimated at 4% of revenue)
        other_costs = round(revenue * 0.04, 2)

        total_costs = round(stock_cost + tech_cost + other_costs, 2)
        net_profit = round(revenue - total_costs, 2)
        margin_pct = round((net_profit / revenue * 100), 1) if revenue > 0 else 0.0

        # Serial items tracked for this order
        serials_list = []
        if getattr(order, 'serial_items', None):
            for s in order.serial_items:
                s_no = getattr(s, 'serial_no', getattr(s, 'serial_number', ''))
                p_name = s.product.name if getattr(s, 'product', None) else ""
                s_status = s.status.value if getattr(s, 'status', None) else "ASSIGNED"
                w_end = getattr(s, 'warranty_end', getattr(s, 'warranty_end_date', None))
                w_str = w_end.strftime("%Y-%m-%d") if w_end and hasattr(w_end, 'strftime') else None
                serials_list.append({
                    "serial_number": s_no,
                    "product_name": p_name,
                    "status": s_status,
                    "warranty_end_date": w_str,
                })

        # Subsidy record info
        subsidy_info = None
        if order.subsidy_record:
            subsidy_info = {
                "status": order.subsidy_record.status.value,
                "sanctioned_amount": getattr(order.subsidy_record, 'sanctioned_amount', 0.0),
                "application_ref": getattr(order.subsidy_record, 'application_no', None) or "PM-SURYA-2026",
            }

        breakdowns.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "customer_name": order.customer.name if order.customer else "N/A",
            "customer_phone": order.customer.phone if order.customer else "N/A",
            "customer_email": order.customer.email if order.customer else "N/A",
            "customer_address": order.customer.address if order.customer else "N/A",
            "customer_city": order.customer.city if order.customer else "Delhi NCR",
            "customer_pincode": order.customer.pincode if order.customer else "110001",
            "capacity_kw": order.quote.template.capacity_kw if (order.quote and order.quote.template) else 3.0,
            "system_type": order.quote.template.system_type if (order.quote and order.quote.template) else "On-Grid",
            "revenue": revenue,
            "paid_amount": order.paid_amount,
            "pending_amount": max(0.0, revenue - order.paid_amount),
            "stock_cost": stock_cost,
            "technician_cost": tech_cost,
            "technician_hours": tech_hours,
            "technician_name": tech_name,
            "other_costs": other_costs,
            "total_costs": total_costs,
            "net_profit": net_profit,
            "profit": net_profit,
            "margin_pct": margin_pct,
            "profit_margin_percent": margin_pct,
            "is_profitable": net_profit > 0,
            "order_status": order.status.value,
            "job_status": job_status_val,
            "created_at": order.created_at.strftime("%Y-%m-%d"),
            "bom_items": bom_items,
            "serials": serials_list,
            "subsidy": subsidy_info,
        })

    return breakdowns


def get_director_dashboard_metrics(db: Session, date_range: str = "this_month") -> Dict[str, Any]:
    start_dt, end_dt = get_date_filter_range(date_range)

    # 1. Financial Metrics
    orders = db.query(Order).filter(Order.created_at >= start_dt, Order.created_at <= end_dt).all()
    total_revenue = sum(o.total_amount for o in orders)
    total_collected = sum(o.paid_amount for o in orders)
    total_pending = max(0.0, total_revenue - total_collected)

    # 2. Profit Analysis
    profit_data = calculate_profit_per_job(db, date_range)
    total_profit = sum(p["net_profit"] for p in profit_data)
    profitable_jobs = sum(1 for p in profit_data if p["is_profitable"])
    loss_making_jobs = sum(1 for p in profit_data if not p["is_profitable"])
    profit_margin_pct = round((total_profit / total_revenue * 100), 1) if total_revenue > 0 else 0.0

    # 3. Financial timeline points for Line Chart
    sorted_orders = sorted(orders, key=lambda o: o.created_at)
    trend_points = []
    cum_rev = 0.0
    cum_col = 0.0
    cum_prof = 0.0
    for o in sorted_orders:
        matching = next((p for p in profit_data if p["order_id"] == o.id), None)
        p_val = matching["net_profit"] if matching else 0.0
        c_val = matching["total_costs"] if matching else 0.0
        cum_rev += o.total_amount
        cum_col += o.paid_amount
        cum_prof += p_val
        trend_points.append({
            "name": o.order_number,
            "date": o.created_at.strftime("%d %b"),
            "revenue": round(o.total_amount, 2),
            "cum_revenue": round(cum_rev, 2),
            "costs": round(c_val, 2),
            "net_profit": round(p_val, 2),
            "cum_profit": round(cum_prof, 2),
            "collected": round(o.paid_amount, 2),
            "cum_collected": round(cum_col, 2),
            "pending": round(max(0.0, o.total_amount - o.paid_amount), 2),
        })

    # 4. Pipeline / Unfinished Jobs by Stage
    unfinished_by_stage = {
        "new_leads": db.query(Lead).filter(Lead.status == LeadStatus.NEW, Lead.is_deleted == False).count(),
        "qualified_leads": db.query(Lead).filter(Lead.status == LeadStatus.QUALIFIED, Lead.is_deleted == False).count(),
        "scheduled_surveys": db.query(Survey).filter(Survey.status == SurveyStatus.SCHEDULED).count(),
        "confirmed_orders": db.query(Order).filter(Order.status == OrderStatus.CONFIRMED).count(),
        "packed_orders": db.query(Order).filter(Order.status == OrderStatus.PACKED).count(),
        "dispatched_orders": db.query(Order).filter(Order.status == OrderStatus.DISPATCHED).count(),
        "scheduled_installs": db.query(InstallationJob).filter(InstallationJob.status == JobStatus.SCHEDULED).count(),
        "in_progress_installs": db.query(InstallationJob).filter(InstallationJob.status == JobStatus.IN_PROGRESS).count(),
    }

    # 5. Support & Tickets
    open_tickets = db.query(Ticket).filter(Ticket.status.in_([TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS])).count()

    # 6. Subsidies Pipeline
    subsidy_counts = {
        "NOT_APPLIED": db.query(SubsidyRecord).filter(SubsidyRecord.status == SubsidyStatus.NOT_APPLIED).count(),
        "APPLIED": db.query(SubsidyRecord).filter(SubsidyRecord.status == SubsidyStatus.APPLIED).count(),
        "APPROVED": db.query(SubsidyRecord).filter(SubsidyRecord.status == SubsidyStatus.APPROVED).count(),
        "DISBURSED": db.query(SubsidyRecord).filter(SubsidyRecord.status == SubsidyStatus.DISBURSED).count(),
    }

    # 7. Low Stock Alerts
    low_stock_count = db.query(Product).filter(Product.stock_quantity <= Product.min_stock_alert).count()

    return {
        "date_range": date_range,
        "revenue": total_revenue,
        "total_revenue": total_revenue,
        "collected_revenue": total_collected,
        "collected_payments": total_collected,
        "pending_revenue": total_pending,
        "pending_payments": total_pending,
        "net_profit": total_profit,
        "profit_margin_percent": profit_margin_pct,
        "profitable_jobs_count": profitable_jobs,
        "loss_making_jobs_count": loss_making_jobs,
        "trend_points": trend_points,
        "unfinished_by_stage": unfinished_by_stage,
        "unfinished_jobs_by_stage": unfinished_by_stage,
        "open_tickets_count": open_tickets,
        "subsidy_pipeline": subsidy_counts,
        "low_stock_count": low_stock_count,
        "low_stock_products_count": low_stock_count,
        "jobs_summary": profit_data[:10],
        "profit_per_job": profit_data,
    }


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

    # Calculate pipeline value (active leads * standard kW rate or active quotes)
    pipeline_value = 0.0
    for l in active_leads:
        quote = l.quotes[0] if l.quotes else None
        if quote and quote.total_amount:
            pipeline_value += quote.total_amount
        else:
            pipeline_value += (l.required_capacity or 3.0) * 65000.0

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


