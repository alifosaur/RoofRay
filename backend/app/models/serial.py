import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class SerialStatus(str, enum.Enum):
    IN_STOCK = "IN_STOCK"
    ALLOCATED = "ALLOCATED"
    DISPATCHED = "DISPATCHED"
    DELIVERED = "DELIVERED"
    INSTALLED = "INSTALLED"


class SerialItem(Base):
    __tablename__ = "serial_items"

    id = Column(Integer, primary_key=True, index=True)
    serial_no = Column(String(128), unique=True, index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)

    status = Column(Enum(SerialStatus), default=SerialStatus.IN_STOCK, nullable=False)
    delivered_on = Column(Date, nullable=True)
    warranty_end = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    product = relationship("Product", back_populates="serial_items")
    order = relationship("Order", back_populates="serial_items")
    customer = relationship("Customer", back_populates="serial_items")
    tickets = relationship("Ticket", back_populates="serial_item")
