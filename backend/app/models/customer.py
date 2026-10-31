from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(32), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=True, index=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), default="Delhi NCR")
    pincode = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="customer_profile")
    orders = relationship("Order", back_populates="customer")
    serial_items = relationship("SerialItem", back_populates="customer")
    tickets = relationship("Ticket", back_populates="customer")

