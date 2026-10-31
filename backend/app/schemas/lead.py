from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.lead import LeadStatus


class LeadPublicCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: str
    required_capacity: float = 3.0
    system_type: str = "On-Grid"
    notes: Optional[str] = None


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

    model_config = ConfigDict(from_attributes=True)

