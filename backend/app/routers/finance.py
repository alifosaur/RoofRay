from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.finance import Invoice, SubsidyRecord, TechnicianPayout
from app.schemas.finance import InvoiceOut, SubsidyRecordOut, SubsidyRecordUpdate, TechnicianPayoutOut
from app.services import finance_service
from app.core import events
from app.models.expense import Expense

router = APIRouter(prefix="/finance", tags=["Finance & Billing"])


from app.models.order import Order


@router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(
    customer_id: Optional[int] = None,
    order_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.TECHNICIAN:
        raise HTTPException(status_code=403, detail="Forbidden: Technicians cannot view invoices")

    query = db.query(Invoice)
    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else -1
        query = query.filter(Invoice.customer_id == cust_id)
    elif customer_id and current_user.role == UserRole.ADMIN:
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
    if current_user.role == UserRole.TECHNICIAN:
        raise HTTPException(status_code=403, detail="Forbidden: Technicians cannot view invoices")

    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else -1
        if inv.customer_id != cust_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot view another customer's invoice")

    return inv


@router.get("/subsidies", response_model=List[SubsidyRecordOut])
def list_subsidies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tracks national solar subsidy paperwork stages."""
    if current_user.role == UserRole.TECHNICIAN:
        raise HTTPException(status_code=403, detail="Forbidden: Technicians cannot view subsidy records")

    query = db.query(SubsidyRecord)
    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else -1
        query = query.join(Order).filter(Order.customer_id == cust_id)

    return query.order_by(SubsidyRecord.updated_at.desc()).all()


@router.put("/subsidies/{subsidy_id}", response_model=SubsidyRecordOut)
def update_subsidy(
    subsidy_id: int,
    payload: SubsidyRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
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
    if current_user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Forbidden: Customers cannot access technician payouts")

    query = db.query(TechnicianPayout)
    if current_user.role == UserRole.TECHNICIAN:
        query = query.filter(TechnicianPayout.technician_id == current_user.id)
    elif technician_id and current_user.role == UserRole.ADMIN:
        query = query.filter(TechnicianPayout.technician_id == technician_id)

    if is_paid is not None:
        query = query.filter(TechnicianPayout.is_paid == is_paid)
    return query.order_by(TechnicianPayout.created_at.desc()).all()


@router.post("/payouts/{payout_id}/pay", response_model=TechnicianPayoutOut)
def disburse_payout(
    payout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Marks technician timesheet payout as disbursed."""
    return finance_service.mark_payout_paid(db, payout_id, current_user.id)



class ExpenseIn(BaseModel):
    category: str = Field(min_length=2)
    amount: float = Field(gt=0)
    expense_date: Optional[date] = None
    description: Optional[str] = None
    order_id: Optional[int] = None


@router.get("/expenses")
def list_expenses(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    rows = db.query(Expense).order_by(Expense.expense_date.desc(), Expense.id.desc()).all()
    return [
        {"id": e.id, "expense_date": e.expense_date, "category": e.category, "amount": e.amount,
         "description": e.description, "order_id": e.order_id}
        for e in rows
    ]


@router.post("/expenses", status_code=status.HTTP_201_CREATED)
def record_expense(payload: ExpenseIn, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    """Other costs (transport, permits, etc.); job-linked costs reduce that job's profit."""
    if payload.order_id and not db.query(Order).filter(Order.id == payload.order_id).first():
        raise HTTPException(status_code=404, detail="Order not found")
    exp = Expense(**payload.model_dump(exclude_none=True), created_by_id=current_user.id)
    db.add(exp)
    db.flush()
    events.emit(db, "finance.expense_recorded", {"expense_id": exp.id, "amount": exp.amount}, roles=[UserRole.ADMIN])
    db.commit()
    return {"id": exp.id}
