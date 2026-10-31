from datetime import datetime, timedelta
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from app.models.survey import SurveyStatus


class SurveyCreate(BaseModel):
    lead_id: int
    technician_id: int
    scheduled_date: datetime
    notes: Optional[str] = None

    @field_validator("scheduled_date")
    @classmethod
    def validate_not_past(cls, v: datetime) -> datetime:
        now_naive = datetime.utcnow()
        v_naive = v.replace(tzinfo=None) if v.tzinfo else v
        # Allow 5 minutes tolerance for form submission latency
        if v_naive < (now_naive - timedelta(minutes=5)):
            raise ValueError("Scheduled date cannot be in the past")
        return v


class SurveyComplete(BaseModel):
    roof_direction: str
    roof_tilt_deg: float
    cable_distance_meters: float
    notes: Optional[str] = None
    address_confirmed: Optional[bool] = None
    roof_length_ft: Optional[float] = None
    roof_width_ft: Optional[float] = None
    shadow_free_area_sqft: Optional[float] = None
    out_of_shade_zone: Optional[bool] = None
    shade_notes: Optional[str] = None
    feasible: Optional[bool] = None  # technician's verdict: True approves the survey; False/None leaves it for sales to review

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "tilt_angle_deg" in data and "roof_tilt_deg" not in data:
                data["roof_tilt_deg"] = data["tilt_angle_deg"]
            if "feasibility_notes" in data and "notes" not in data:
                data["notes"] = data["feasibility_notes"]
        return data


class SurveyPhotoOut(BaseModel):
    id: int
    photo_url: str
    caption: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SurveyOut(BaseModel):
    id: int
    lead_id: int
    technician_id: int
    scheduled_date: datetime
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    site_address: Optional[str] = None
    required_capacity: Optional[float] = None
    system_type: Optional[str] = None
    roof_direction: Optional[str] = None
    roof_tilt_deg: Optional[float] = None
    cable_distance_meters: Optional[float] = None
    address_confirmed: Optional[bool] = None
    roof_length_ft: Optional[float] = None
    roof_width_ft: Optional[float] = None
    shadow_free_area_sqft: Optional[float] = None
    out_of_shade_zone: Optional[bool] = None
    shade_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    photos: List[SurveyPhotoOut] = []
    notes: Optional[str] = None
    status: SurveyStatus
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

