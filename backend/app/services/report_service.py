import io
import os
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
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
    orders = db.query(Order).filter(Order.created_at >= start_dt, Order.created_at <= end_dt).all()

    breakdowns = []
    for order in orders:
        revenue = order.total_amount

        # 1. Stock Cost (sum of BOM items cost price)
        stock_cost = 0.0
        if order.quote and order.quote.lines:
            for ql in order.quote.lines:
                unit_cost = ql.product.cost_price if ql.product else 0.0
                stock_cost += ql.quantity * unit_cost

        # 2. Technician Cost (from timesheet if completed)
        tech_cost = 0.0
        if order.installation_job and order.installation_job.timesheet:
            tech_cost = order.installation_job.timesheet.total_cost

        # 3. Other logistics / transport overhead (estimated at 4% of revenue)
        other_costs = round(revenue * 0.04, 2)

        total_costs = stock_cost + tech_cost + other_costs
        net_profit = round(revenue - total_costs, 2)
        margin_pct = round((net_profit / revenue * 100), 1) if revenue > 0 else 0.0

        breakdowns.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "customer_name": order.customer.name if order.customer else "N/A",
            "capacity_kw": order.quote.template.capacity_kw if (order.quote and order.quote.template) else 0.0,
            "revenue": revenue,
            "stock_cost": stock_cost,
            "technician_cost": tech_cost,
            "other_costs": other_costs,
            "total_costs": total_costs,
            "net_profit": net_profit,
            "margin_pct": margin_pct,
            "is_profitable": net_profit > 0,
            "order_status": order.status.value,
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

    # 3. Pipeline / Unfinished Jobs by Stage
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

    # 4. Support & Tickets
    open_tickets = db.query(Ticket).filter(Ticket.status.in_([TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS])).count()

    # 5. Subsidies Pipeline
    subsidy_counts = {
        "NOT_APPLIED": db.query(SubsidyRecord).filter(SubsidyRecord.status == SubsidyStatus.NOT_APPLIED).count(),
        "APPLIED": db.query(SubsidyRecord).filter(SubsidyRecord.status == SubsidyStatus.APPLIED).count(),
        "APPROVED": db.query(SubsidyRecord).filter(SubsidyRecord.status == SubsidyStatus.APPROVED).count(),
        "DISBURSED": db.query(SubsidyRecord).filter(SubsidyRecord.status == SubsidyStatus.DISBURSED).count(),
    }

    # 6. Low Stock Alerts
    low_stock_count = db.query(Product).filter(Product.stock_quantity <= Product.min_stock_alert).count()

    return {
        "date_range": date_range,
        "revenue": total_revenue,
        "collected_payments": total_collected,
        "pending_payments": total_pending,
        "net_profit": total_profit,
        "profitable_jobs_count": profitable_jobs,
        "loss_making_jobs_count": loss_making_jobs,
        "unfinished_by_stage": unfinished_by_stage,
        "open_tickets_count": open_tickets,
        "subsidy_pipeline": subsidy_counts,
        "low_stock_count": low_stock_count,
        "jobs_summary": profit_data[:10],  # Latest 10 jobs
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

    ws1.append(["SunPower Solutions - Executive Operations Summary"])
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
    filename = f"SunPower_Executive_Report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
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
