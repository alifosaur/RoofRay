from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.job import JobStatus
from app.schemas.user import UserOut


class JobPhotoOut(BaseModel):
    id: int
    job_id: int
    photo_url: str
    caption: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobSignatureOut(BaseModel):
    id: int
    job_id: int
    signature_data: str
    customer_name: str
    signed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TimesheetOut(BaseModel):
    id: int
    job_id: int
    technician_id: int
    start_time: datetime
    finish_time: datetime
    hours: float
    hourly_rate: float
    total_cost: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobCompleteRequest(BaseModel):
    confirmed_capacity_kw: float
    power_generating: bool
    customer_name: str
    signature_data: str  # Base64 canvas data or signature URL
    finish_time: Optional[datetime] = None
    notes: Optional[str] = None


class InstallationJobOut(BaseModel):
    id: int
    order_id: int
    technician_id: int
    scheduled_date: datetime
    status: JobStatus
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    confirmed_capacity_kw: Optional[float] = None
    power_generating: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    photos: List[JobPhotoOut] = []
    signature: Optional[JobSignatureOut] = None
    timesheet: Optional[TimesheetOut] = None

    model_config = ConfigDict(from_attributes=True)
