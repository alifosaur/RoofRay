import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.lead import LeadStatus
from app.schemas.survey import SurveyOut


class LeadPublicCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: str
    required_capacity: float = 3.0
    system_type: str = "On-Grid"
    notes: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v or "")
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        elif len(digits) > 10:
            digits = digits[-10:]
        if len(v or "") < 5:
            raise ValueError("Phone number must have at least 5 characters")
        return digits if len(digits) >= 5 else v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if "@" not in v or "." not in v.split("@")[-1]:
                raise ValueError("Email must contain '@' and '.' with a valid domain (e.g. name@domain.com)")
        return v

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        words = len(v.strip().split())
        if words > 150:
            raise ValueError(f"Address cannot exceed 150 words (currently {words} words)")
        return v


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    required_capacity: Optional[float] = None
    system_type: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[LeadStatus] = None
    assigned_to_id: Optional[int] = None
    lost_reason: Optional[str] = None


class CallChecklistCreate(BaseModel):
    shadow_free_area_sqft: float
    monthly_bill_amount: float
    is_grid_suitable: bool = True
    remarks: Optional[str] = None
    lost_reason: Optional[str] = None  # Required if not grid suitable


class CallChecklistOut(BaseModel):
    id: int
    shadow_free_area_sqft: float
    monthly_bill_amount: float
    is_grid_suitable: bool
    remarks: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadOut(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    property_type: Optional[str] = None
    roof_type: Optional[str] = None
    roof_area_sqft: Optional[float] = None
    shadow_free_area_sqft: Optional[float] = None
    floor_number: Optional[int] = 1
    roof_direction: Optional[str] = None
    monthly_bill_amount: Optional[float] = None
    source: Optional[str] = "customer_portal"
    required_capacity: float
    system_type: str
    notes: Optional[str] = None
    status: LeadStatus
    lost_reason: Optional[str] = None
    is_deleted: bool
    assigned_to_id: Optional[int] = None
    customer_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    call_checklist: Optional[CallChecklistOut] = None
    survey: Optional[SurveyOut] = None

    model_config = ConfigDict(from_attributes=True)


