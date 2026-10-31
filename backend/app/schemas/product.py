from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.product import ProductCategory


class ProductBase(BaseModel):
    sku: str
    name: str
    category: ProductCategory
    description: Optional[str] = None
    is_serialised: bool = False
    warranty_years: int = 2
    cost_price: float
    sale_price: float
    stock_quantity: int = 0
    min_stock_alert: int = 5


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_serialised: Optional[bool] = None
    warranty_years: Optional[int] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    min_stock_alert: Optional[int] = None


class ProductOut(ProductBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
