from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.order import OrderStatus
from app.models.payment import PaymentMethod


class PaymentCreate(BaseModel):
    amount: float
    method: PaymentMethod
    transaction_ref: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    order_id: int
    amount: float
    method: PaymentMethod
    transaction_ref: Optional[str] = None
    recorded_by_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderOut(BaseModel):
    id: int
    order_number: str
    quote_id: int
    customer_id: int
    status: OrderStatus
    total_amount: float
    paid_amount: float
    confirmed_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    installed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    payments: List[PaymentOut] = []
    invoice_id: Optional[int] = None
    pick_list_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    capacity_kw: Optional[float] = None
    system_type: Optional[str] = None
    technician_id: Optional[int] = None
    technician_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
