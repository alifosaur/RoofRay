from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.quote import QuoteStatus
from app.schemas.product import ProductOut


class QuoteLineCreate(BaseModel):
    product_id: int
    quantity: int = 1
    unit_price: Optional[float] = None


class QuoteLineOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    subtotal: float
    product: ProductOut

    model_config = ConfigDict(from_attributes=True)


class QuoteCreate(BaseModel):
    lead_id: int
    template_id: int
    subsidy_amount: Optional[float] = None
    notes: Optional[str] = None


class QuoteOut(BaseModel):
    id: int
    quote_number: str
    lead_id: int
    customer_id: int
    template_id: Optional[int] = None
    status: QuoteStatus
    subtotal: float
    subsidy_amount: float
    tax_amount: float
    total_amount: float
    pdf_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lines: List[QuoteLineOut] = []

    model_config = ConfigDict(from_attributes=True)
