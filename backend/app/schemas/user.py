from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
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
    """Public self-registration. Always creates a CUSTOMER; any role field is ignored."""
    full_name: str = Field(min_length=2)
    phone: str = Field(min_length=6)
    email: Optional[str] = None      # local mode (Firebase mode takes it from the ID token)
    password: Optional[str] = None   # local mode only
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None


class StaffCreateRequest(BaseModel):
    email: str
    full_name: str = Field(min_length=2)
    role: UserRole
    phone: Optional[str] = None
    hourly_rate: int = 0
    is_active: bool = True
    password: Optional[str] = Field(default=None, min_length=8)  # optional initial password set by the admin

    @field_validator("role", mode="before")
    @classmethod
    def parse_role(cls, v: Any) -> Any:
        return v.lower() if isinstance(v, str) else v


class AdminSetPasswordRequest(BaseModel):
    password: str = Field(min_length=8)


class UserLoginRequest(BaseModel):
    email: str
    password: str


class PasswordSetupRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class StaffCreateResponse(BaseModel):
    user: UserOut
    auth_mode: str
    password_setup_url: Optional[str] = None  # local mode: share with the staff member
