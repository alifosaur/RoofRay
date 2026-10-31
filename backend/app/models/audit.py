from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    record_type = Column(String(64), index=True, nullable=False)  # "lead", "quote", "order", "job", "ticket"
    record_id = Column(Integer, index=True, nullable=False)
    action = Column(String(128), nullable=False)  # e.g., "STATUS_CHANGE", "NOTE_ADDED", "PAYMENT_RECORDED"
    from_status = Column(String(64), nullable=True)
    to_status = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")

