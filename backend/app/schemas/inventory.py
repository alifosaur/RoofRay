from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.inventory import MovementType
from app.schemas.product import ProductOut


class StockMovementCreate(BaseModel):
    product_id: int
    quantity: int
    unit_cost: float
    reference: Optional[str] = None


class StockMovementOut(BaseModel):
    id: int
    product_id: int
    movement_type: MovementType
    quantity: int
    unit_cost: float
    reference: Optional[str] = None
    created_at: datetime
    product: ProductOut

    model_config = ConfigDict(from_attributes=True)


class PickListLineOut(BaseModel):
    id: int
    product_id: int
    required_qty: int
    picked_qty: int
    product: ProductOut

    model_config = ConfigDict(from_attributes=True)


class PickListOut(BaseModel):
    id: int
    order_id: int
    status: str
    created_at: datetime
    packed_at: Optional[datetime] = None
    lines: List[PickListLineOut] = []

    model_config = ConfigDict(from_attributes=True)
