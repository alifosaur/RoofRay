from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.user import UserRole


class UserBase(BaseModel):
    email: str
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    hourly_rate: int = 500
    is_active: bool = True

    @field_validator("role", mode="before")
    @classmethod
    def parse_role(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v


class UserCreate(UserBase):
    firebase_uid: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = None
    hourly_rate: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("role", mode="before")
    @classmethod
    def parse_role(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v


class UserOut(UserBase):
    id: int
    firebase_uid: str
    customer_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRegisterRequest(BaseModel):
    email: str
    full_name: str
    phone: str
    password: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    firebase_uid: Optional[str] = None
    # Any role field provided is ignored/discarded for security


class StaffRegisterRequest(BaseModel):
    email: str
    full_name: str
    phone: str
    role: str = "sales"
    password: Optional[str] = None
    department: Optional[str] = None
    firebase_uid: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: str
    password: Optional[str] = None
    role: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
