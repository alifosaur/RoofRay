import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    SURVEY_SCHEDULED = "SURVEY_SCHEDULED"
    SURVEY_APPROVED = "SURVEY_APPROVED"
    QUOTED = "QUOTED"
    WON = "WON"
    LOST = "LOST"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(32), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    property_type = Column(String(64), nullable=True)  # "Residential", "Commercial", "Industrial"
    roof_type = Column(String(64), nullable=True)  # "Concrete / Flat", "Tiled / Slanted", "Tin / Metal Sheet"
    roof_area_sqft = Column(Float, nullable=True)
    shadow_free_area_sqft = Column(Float, nullable=True)
    floor_number = Column(Integer, nullable=True, default=1)
    roof_direction = Column(String(64), nullable=True)  # "South", "East", "West", "North", "Unknown"
    monthly_bill_amount = Column(Float, nullable=True)
    required_capacity = Column(Float, nullable=False, default=3.0)  # in kW
    system_type = Column(String(64), nullable=False, default="On-Grid")  # "On-Grid", "Off-Grid"
    source = Column(String(64), default="customer_portal", nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW, nullable=False)
    lost_reason = Column(String(255), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)  # Soft delete requirement

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    assigned_to = relationship("User")
    customer = relationship("Customer")
    call_checklist = relationship("CallChecklist", back_populates="lead", uselist=False)
    survey = relationship("Survey", back_populates="lead", uselist=False)
    quotes = relationship("Quote", back_populates="lead")


class CallChecklist(Base):
    __tablename__ = "call_checklists"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), unique=True, nullable=False)
    shadow_free_area_sqft = Column(Float, nullable=False)
    monthly_bill_amount = Column(Float, nullable=False)
    is_grid_suitable = Column(Boolean, nullable=False, default=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lead = relationship("Lead", back_populates="call_checklist")

