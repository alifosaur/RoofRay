from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.user import UserRole


class UserBase(BaseModel):
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    hourly_rate: int = 500
    is_active: bool = True


class UserCreate(UserBase):
    firebase_uid: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = None
    hourly_rate: Optional[int] = None
    is_active: Optional[bool] = None


class UserOut(UserBase):
    id: int
    firebase_uid: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
