from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.finance import InvoiceType, InvoiceStatus, SubsidyStatus


class InvoiceLineOut(BaseModel):
    id: int
    description: str
    quantity: int
    unit_price: float
    amount: float

    model_config = ConfigDict(from_attributes=True)


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    order_id: Optional[int] = None
    ticket_id: Optional[int] = None
    customer_id: int
    invoice_type: InvoiceType
    status: InvoiceStatus
    subtotal: float
    tax_amount: float
    total_amount: float
    due_date: Optional[date] = None
    created_at: datetime
    lines: List[InvoiceLineOut] = []

    model_config = ConfigDict(from_attributes=True)


class SubsidyRecordUpdate(BaseModel):
    application_no: Optional[str] = None
    application_ref: Optional[str] = None
    portal_name: Optional[str] = None
    status: Optional[SubsidyStatus] = None
    eligible_amount: Optional[float] = None
    sanctioned_amount: Optional[float] = None
    approved_amount: Optional[float] = None
    disbursed_amount: Optional[float] = None
    applied_date: Optional[date] = None
    approved_date: Optional[date] = None
    disbursed_date: Optional[date] = None
    rejection_notes: Optional[str] = None
    remarks: Optional[str] = None


class SubsidyRecordOut(BaseModel):
    id: int
    order_id: int
    application_no: Optional[str] = None
    application_ref: Optional[str] = None
    portal_name: str
    status: SubsidyStatus
    eligible_amount: float
    sanctioned_amount: Optional[float] = 0.0
    approved_amount: Optional[float] = 0.0
    disbursed_amount: float
    applied_date: Optional[date] = None
    approved_date: Optional[date] = None
    disbursed_date: Optional[date] = None
    rejection_notes: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TechnicianPayoutOut(BaseModel):
    id: int
    technician_id: int
    job_id: int
    hours: float
    hourly_rate: float
    total_amount: float
    is_paid: bool
    paid_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

