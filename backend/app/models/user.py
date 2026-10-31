import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    SALES = "sales"
    TECHNICIAN = "technician"
    WAREHOUSE = "warehouse"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String(128), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    phone = Column(String(32), nullable=True)
    hourly_rate = Column(Integer, default=500, nullable=False)  # For technician payouts (in INR)
    is_active = Column(Boolean, default=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # local auth mode only; Firebase holds passwords otherwise
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    customer_profile = relationship("Customer", back_populates="user", uselist=False)

