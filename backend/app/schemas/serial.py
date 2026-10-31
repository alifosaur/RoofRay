from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.serial import SerialStatus
from app.schemas.product import ProductOut


class SerialItemRegister(BaseModel):
    product_id: int
    serial_numbers: List[str]  # Bulk register serials received in warehouse


class SerialScanRequest(BaseModel):
    order_id: int
    serial_no: str


class SerialItemOut(BaseModel):
    id: int
    serial_no: str
    product_id: int
    order_id: Optional[int] = None
    customer_id: Optional[int] = None
    status: SerialStatus
    scanned_at: Optional[datetime] = None
    delivered_on: Optional[date] = None  # warranty start
    warranty_end: Optional[date] = None
    created_at: datetime
    product: ProductOut

    model_config = ConfigDict(from_attributes=True)

