import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProductCategory(str, enum.Enum):
    PANEL = "panel"
    INVERTER = "inverter"
    BATTERY = "battery"
    CONTROLLER = "charge_controller"
    BOS = "balance_of_system"  # wiring, earthing, stands, connectors
    SERVICE = "service"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(Enum(ProductCategory), nullable=False)
    description = Column(Text, nullable=True)

    is_serialised = Column(Boolean, default=False, nullable=False)
    warranty_years = Column(Integer, default=2, nullable=False)  # 20 for panels, 2 for inverters/batteries

    cost_price = Column(Float, nullable=False)
    sale_price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    min_stock_alert = Column(Integer, default=5, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    bom_lines = relationship("BOMLine", back_populates="product")
    quote_lines = relationship("QuoteLine", back_populates="product")
    serial_items = relationship("SerialItem", back_populates="product")
