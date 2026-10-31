from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, model_validator
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
    power_generating: bool = True
    customer_name: str = "Customer"
    signature_data: str = ""  # Base64 canvas data or signature URL
    finish_time: Optional[datetime] = None
    generation_reading_kw: Optional[float] = None
    inverter_serial: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # power_generating aliases
            if "power_generated_test" in data and "power_generating" not in data:
                data["power_generating"] = bool(data["power_generated_test"])
            elif "test_passed" in data and "power_generating" not in data:
                data["power_generating"] = bool(data["test_passed"])

            # signature aliases
            if "customer_signature_base64" in data and not data.get("signature_data"):
                data["signature_data"] = data["customer_signature_base64"]
            elif "customer_signature" in data and not data.get("signature_data"):
                data["signature_data"] = data["customer_signature"]

            if not data.get("customer_name"):
                data["customer_name"] = "Customer"
        return data


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

