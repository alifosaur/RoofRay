from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.ticket import TicketStatus
from app.schemas.serial import SerialItemOut
from app.schemas.user import UserOut


class TicketCreate(BaseModel):
    customer_id: int
    serial_item_id: Optional[int] = None
    subject: str
    description: str


class TicketResolveRequest(BaseModel):
    resolution_notes: str
    parts_cost: float = 0.0
    labour_cost: float = 0.0


class TicketOut(BaseModel):
    id: int
    ticket_number: str
    customer_id: int
    serial_item_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    subject: str
    description: str
    status: TicketStatus
    is_billable: bool
    resolution_notes: Optional[str] = None
    repair_cost: float
    customer_confirmed_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WarrantyLookupResult(BaseModel):
    customer_id: int
    customer_name: str
    customer_phone: str
    customer_address: str
    serial_id: Optional[int] = None
    serial_no: Optional[str] = None
    product_name: Optional[str] = None
    delivered_on: Optional[date] = None
    warranty_end: Optional[date] = None
    in_warranty: bool
    days_left: int
    service_history: List[TicketOut] = []
