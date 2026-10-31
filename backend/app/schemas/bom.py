from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.product import ProductOut


class BOMLineBase(BaseModel):
    product_id: int
    quantity: int = 1


class BOMLineCreate(BOMLineBase):
    pass


class BOMLineOut(BOMLineBase):
    id: int
    product: ProductOut

    model_config = ConfigDict(from_attributes=True)


class BOMTemplateBase(BaseModel):
    name: str
    capacity_kw: float
    system_type: str  # "On-Grid", "Off-Grid"
    description: Optional[str] = None


class BOMTemplateCreate(BOMTemplateBase):
    lines: List[BOMLineCreate]


class BOMTemplateOut(BOMTemplateBase):
    id: int
    created_at: datetime
    lines: List[BOMLineOut] = []

    model_config = ConfigDict(from_attributes=True)

