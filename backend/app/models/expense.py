from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from app.core.database import Base


class Expense(Base):
    """Operating costs other than stock purchases and technician pay (transport, permits, etc.)."""
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    expense_date = Column(Date, default=date.today, nullable=False, index=True)
    category = Column(String(64), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)  # set when the cost belongs to a job
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
