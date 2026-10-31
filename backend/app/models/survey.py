import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class SurveyStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), unique=True, nullable=False)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_date = Column(DateTime, nullable=False)

    roof_direction = Column(String(64), nullable=True)  # e.g. "South", "South-West"
    roof_tilt_deg = Column(Float, nullable=True)        # e.g. 15.0 to 25.0 degrees
    cable_distance_meters = Column(Float, nullable=True) # e.g. 20 meters
    notes = Column(Text, nullable=True)
    status = Column(Enum(SurveyStatus), default=SurveyStatus.SCHEDULED, nullable=False)

    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    lead = relationship("Lead", back_populates="survey")
    technician = relationship("User", foreign_keys=[technician_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

