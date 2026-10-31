import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Executive Reports & Dashboard"])


@router.get("/dashboard")
def get_dashboard(
    range: str = Query("this_month", pattern="^(today|this_week|this_month|all)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
):
    """
    Director executive dashboard:
    Revenue, collected vs pending, net profit, profitable vs loss-making jobs,
    open tickets, low stock, and subsidy pipeline.
    """
    return report_service.get_director_dashboard_metrics(db, range)


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
    db: Session = Depends(get_db),
):
    """Public read-only dashboard accessible via expiring share token."""
    if not report_service.verify_share_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired shareable dashboard token.",
        )
    return report_service.get_director_dashboard_metrics(db, range)
