from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, model_validator
from app.models.survey import SurveyStatus


class SurveyCreate(BaseModel):
    lead_id: int
    technician_id: int
    scheduled_date: datetime
    notes: Optional[str] = None


class SurveyComplete(BaseModel):
    roof_direction: str
    roof_tilt_deg: float
    cable_distance_meters: float
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "tilt_angle_deg" in data and "roof_tilt_deg" not in data:
                data["roof_tilt_deg"] = data["tilt_angle_deg"]
            if "feasibility_notes" in data and "notes" not in data:
                data["notes"] = data["feasibility_notes"]
        return data


class SurveyOut(BaseModel):
    id: int
    lead_id: int
    technician_id: int
    scheduled_date: datetime
    roof_direction: Optional[str] = None
    roof_tilt_deg: Optional[float] = None
    cable_distance_meters: Optional[float] = None
    notes: Optional[str] = None
    status: SurveyStatus
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

