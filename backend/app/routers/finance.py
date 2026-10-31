from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.finance import Invoice, SubsidyRecord, TechnicianPayout
from app.schemas.finance import InvoiceOut, SubsidyRecordOut, SubsidyRecordUpdate, TechnicianPayoutOut
from app.services import finance_service

router = APIRouter(prefix="/finance", tags=["Finance & Billing"])


@router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(
    customer_id: Optional[int] = None,
    order_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Invoice)
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    if order_id:
        query = query.filter(Invoice.order_id == order_id)
    return query.order_by(Invoice.created_at.desc()).all()


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.get("/subsidies", response_model=List[SubsidyRecordOut])
def list_subsidies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tracks national solar subsidy paperwork stages."""
    return db.query(SubsidyRecord).order_by(SubsidyRecord.updated_at.desc()).all()


@router.put("/subsidies/{subsidy_id}", response_model=SubsidyRecordOut)
def update_subsidy(
    subsidy_id: int,
    payload: SubsidyRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ACCOUNTS, UserRole.ADMIN, UserRole.SALES)),
):
    """Updates subsidy tracking status (NOT_APPLIED -> APPLIED -> APPROVED -> DISBURSED)."""
    return finance_service.update_subsidy_record(db, subsidy_id, payload, current_user.id)


@router.get("/payouts", response_model=List[TechnicianPayoutOut])
def list_payouts(
    technician_id: Optional[int] = None,
    is_paid: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(TechnicianPayout)
    if technician_id:
        query = query.filter(TechnicianPayout.technician_id == technician_id)
    elif current_user.role == UserRole.TECHNICIAN:
        query = query.filter(TechnicianPayout.technician_id == current_user.id)
    if is_paid is not None:
        query = query.filter(TechnicianPayout.is_paid == is_paid)
    return query.order_by(TechnicianPayout.created_at.desc()).all()


@router.post("/payouts/{payout_id}/pay", response_model=TechnicianPayoutOut)
def disburse_payout(
    payout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ACCOUNTS, UserRole.ADMIN)),
):
    """Marks technician timesheet payout as disbursed."""
    return finance_service.mark_payout_paid(db, payout_id, current_user.id)

