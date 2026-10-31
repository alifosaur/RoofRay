import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class MovementType(str, enum.Enum):
    PURCHASE = "PURCHASE"   # Inward stock
    ISSUE = "ISSUE"         # Outward stock for order


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    movement_type = Column(Enum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    reference = Column(String(128), nullable=True)  # PO Number or Order Number
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    product = relationship("Product")


class PickList(Base):
    __tablename__ = "pick_lists"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    status = Column(String(32), default="PENDING", nullable=False)  # PENDING, PACKED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    packed_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="pick_list")
    lines = relationship("PickListLine", back_populates="pick_list", cascade="all, delete-orphan")


class PickListLine(Base):
    __tablename__ = "pick_list_lines"

    id = Column(Integer, primary_key=True, index=True)
    pick_list_id = Column(Integer, ForeignKey("pick_lists.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    required_qty = Column(Integer, nullable=False)
    picked_qty = Column(Integer, default=0, nullable=False)

    pick_list = relationship("PickList", back_populates="lines")
    product = relationship("Product")
