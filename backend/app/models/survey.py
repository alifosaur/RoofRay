import enum
from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, Float, Text, Enum, ForeignKey, DateTime
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

    # Technician site measurements (submitted with the survey)
    address_confirmed = Column(Boolean, nullable=True)
    roof_length_ft = Column(Float, nullable=True)
    roof_width_ft = Column(Float, nullable=True)
    shadow_free_area_sqft = Column(Float, nullable=True)
    out_of_shade_zone = Column(Boolean, nullable=True)
    shade_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
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
    photos = relationship("SurveyPhoto", back_populates="survey", cascade="all, delete-orphan")

    @property
    def site_address(self):
        if not self.lead:
            return None
        parts = [p for p in (self.lead.address, self.lead.city, self.lead.state, self.lead.pincode) if p]
        return ", ".join(parts) if parts else self.lead.address

    @property
    def customer_name(self):
        return self.lead.name if self.lead else None

    @property
    def customer_phone(self):
        return self.lead.phone if self.lead else None

    @property
    def required_capacity(self):
        return self.lead.required_capacity if self.lead else None

    @property
    def system_type(self):
        return self.lead.system_type if self.lead else None


class SurveyPhoto(Base):
    __tablename__ = "survey_photos"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"), nullable=False, index=True)
    photo_url = Column(String(512), nullable=False)
    caption = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    survey = relationship("Survey", back_populates="photos")

    @property
    def customer_name(self) -> str:
        return self.lead.name if self.lead else "Customer"

    @property
    def customer_phone(self) -> str:
        return self.lead.phone if self.lead else ""

    @property
    def site_address(self) -> str:
        return self.lead.address if self.lead else "Site Location"

    @property
    def required_capacity(self) -> float:
        return self.lead.required_capacity if self.lead else 3.0

    @property
    def system_type(self) -> str:
        return self.lead.system_type if self.lead else "On-Grid"

