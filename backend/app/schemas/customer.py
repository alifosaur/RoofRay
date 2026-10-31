import re
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class CustomerEnquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(...)
    email: Optional[str] = None
    address: str = Field(..., min_length=5)
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    property_type: Optional[str] = None
    roof_type: Optional[str] = None
    roof_length_ft: Optional[float] = None
    roof_width_ft: Optional[float] = None
    roof_area_sqft: Optional[float] = None
    shadow_free_area_sqft: Optional[float] = None
    floor_number: Optional[int] = 1
    roof_direction: Optional[str] = None  # if known
    monthly_bill_amount: Optional[float] = None
    preferred_system_type: str = "On-Grid"
    preferred_capacity_kw: float = 3.0
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

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if v:
            digits = re.sub(r"\D", "", v)
            if digits and len(digits) != 6:
                raise ValueError("PIN code must be 6 digits")
            return digits
        return v


class CustomerEnquiryResponse(BaseModel):
    message: str = "Thank you! Our sales representative will contact you soon."
    lead_id: int
    status: str
    assigned_sales_rep: Optional[str] = None


class TrackerStage(BaseModel):
    key: str
    title: str
    status: str  # "COMPLETED", "CURRENT", "PENDING"
    date: Optional[str] = None
    description: Optional[str] = None


class CustomerTrackerOut(BaseModel):
    lead_id: Optional[int] = None
    order_id: Optional[int] = None
    system_size_kw: Optional[float] = None
    system_type: Optional[str] = None
    current_stage_key: str
    current_stage_name: str
    stages: List[TrackerStage]


class CustomerEquipmentOut(BaseModel):
    id: int
    serial_number: str
    product_name: str
    product_category: str
    warranty_years: int
    delivered_on: Optional[str] = None
    warranty_end: Optional[str] = None
    days_remaining: Optional[int] = None
    is_in_warranty: bool


class CustomerTicketCreate(BaseModel):
    serial_item_id: Optional[int] = None
    subject: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    priority: Optional[str] = "NORMAL"


class SubsidyEstimatorRequest(BaseModel):
    capacity_kw: float = Field(default=3.0, ge=0.5, le=50.0)
    system_type: str = "On-Grid"
    monthly_bill: Optional[float] = None
    state: Optional[str] = "National"


class SubsidyEstimatorResponse(BaseModel):
    capacity_kw: float
    system_type: str
    estimated_gross_cost: float
    central_subsidy: float
    state_subsidy: float
    estimated_net_cost: float
    annual_savings_units: float
    annual_bill_savings: float
    is_eligible: bool
    subsidy_breakdown: str
    disclaimer: str
    portal_url: str = "https://pmsuryaghar.gov.in"


class GovernmentSchemeOut(BaseModel):
    id: int
    name: str
    description: str
    eligibility: str
    benefit_amounts: str
    how_to_apply: str
    official_link: str
    state: str
    is_active: bool
    is_announcement: bool
    announcement_text: Optional[str] = None
    cfa_per_kw_first_2kw: float = 0.0
    cfa_per_kw_3rd_kw: float = 0.0
    cfa_max: float = 0.0
    state_topup_per_kw: float = 0.0
    grid_connected_only: bool = True


class CustomerSubsidyOut(BaseModel):
    id: Optional[int] = None
    application_no: Optional[str] = None
    portal_name: str = "National Solar Portal"
    status: str
    eligible_amount: float
    sanctioned_amount: float
    disbursed_amount: float
    applied_date: Optional[str] = None
    approved_date: Optional[str] = None
    disbursed_date: Optional[str] = None
    rejection_notes: Optional[str] = None
    remarks: Optional[str] = None
    events: List[dict] = []

