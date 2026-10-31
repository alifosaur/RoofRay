from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from app.core.database import Base


class GovernmentScheme(Base):
    __tablename__ = "government_schemes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    eligibility = Column(Text, nullable=False)
    benefit_amounts = Column(Text, nullable=False)
    how_to_apply = Column(Text, nullable=False)
    official_link = Column(String(512), default="https://pmsuryaghar.gov.in", nullable=False)
    state = Column(String(100), default="National / All India", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_announcement = Column(Boolean, default=False, nullable=False)
    announcement_text = Column(String(512), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

