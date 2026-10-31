from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.core.database import Base


class OutboxEvent(Base):
    """
    Transactional outbox: written in the same DB transaction as the change it describes,
    then streamed to connected clients by /api/events (SSE). Never written for anything that did not happen.
    """
    __tablename__ = "outbox_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False)   # e.g. lead.created, order.stage_changed
    payload = Column(Text, nullable=False, default="{}")  # JSON
    target_roles = Column(String(128), nullable=True)   # comma-separated roles, e.g. "admin,sales"
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
