import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Executive Reports & Dashboard"])


@router.get("/dashboard")
def get_dashboard(
    range: str = Query("this_month", pattern="^(today|this_week|this_month|all)$"),
    granularity: str = Query("day", pattern="^(day|week|month)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Admin finance & operations dashboard, computed from the database (cached ≤45 s, invalidated by events):
    money received / spent / pending, payouts, profit per job, profit series by day/week/month,
    unfinished work by stage, open tickets, low stock and subsidy pipeline.
    """
    return report_service.get_director_dashboard_metrics(db, range, granularity)


@router.get("/profit-per-job")
def get_profit_per_job(
    range: str = Query("this_month", pattern="^(today|this_week|this_month|all)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Detailed profit per job analysis:
    Revenue minus BOM stock costs minus technician hours minus overhead.
    """
    return report_service.calculate_profit_per_job(db, range)


@router.get("/export.xlsx")
def export_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Generates and downloads full financial & operations Excel spreadsheet."""
    file_path = report_service.export_dashboard_to_excel(db)
    return FileResponse(
        file_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=os.path.basename(file_path),
    )


@router.get("/export.pdf")
def export_pdf(
    range: str = Query("this_month", pattern="^(today|this_week|this_month|all)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    pdf = report_service.export_dashboard_to_pdf(db, range)
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="report_{range}.pdf"'})


@router.post("/share-link")
def create_dashboard_share_link(
    expires_days: int = 7,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Generates a secure, expiring token for read-only executive / investor sharing."""
    token = report_service.generate_share_token(expires_days)
    return {
        "share_token": token,
        "expires_in_days": expires_days,
        "shareable_url": f"/shared/dashboard?token={token}",
    }


@router.get("/shared/{token}")
def get_shared_dashboard(
    token: str,
    range: str = Query("this_month", pattern="^(today|this_week|this_month|all)$"),
    granularity: str = Query("day", pattern="^(day|week|month)$"),
    db: Session = Depends(get_db),
):
    """Public read-only dashboard accessible via expiring share token."""
    if not report_service.verify_share_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired shareable dashboard token.",
        )
    metrics = dict(report_service.get_director_dashboard_metrics(db, range, granularity))
    # Shared (investor) view: aggregates only, no customer-level records
    metrics.pop("profit_per_job", None)
    return metrics


@router.get("/sales-metrics")
def get_sales_performance_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
):
    """
    Sales dashboard metrics & commission tracking:
    Conversion rate, pipeline value, average deal size, commission earned per completed sale.
    """
    sales_id = current_user.id if current_user.role == UserRole.SALES else None
    return report_service.get_sales_metrics(db, sales_id)

