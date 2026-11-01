import re
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.models.user import UserRole


def _check_email_format(email: str) -> str:
    v = (email or "").strip()
    if "@" not in v or "." not in v.split("@")[-1]:
        raise ValueError("Email must contain '@' and '.' with a valid domain (e.g. name@domain.com)")
    return v


def _check_phone_10_digits(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif len(digits) > 10:
        digits = digits[-10:]
    if len(phone) < 5:
        raise ValueError("Phone number must have at least 5 characters")
    return digits if len(digits) >= 5 else phone


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
    email: str
    password: str = Field(min_length=8)
    otp: str = Field(min_length=6, max_length=6)  # code emailed by /auth/register/request-otp
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _check_email_format(v)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return _check_phone_10_digits(v)
        return res

    @field_validator("address")
    @classmethod
    def validate_address(cls, v: Optional[str]) -> Optional[str]:
        if v:
            words = len(v.strip().split())
            if words > 150:
                raise ValueError(f"Address cannot exceed 150 words (currently {words} words)")
        return v


class StaffCreateRequest(BaseModel):
    email: str
    full_name: str = Field(min_length=2)
    role: UserRole
    phone: Optional[str] = None
    hourly_rate: int = 0
    is_active: bool = True
    password: Optional[str] = Field(default=None, min_length=8)  # optional initial password set by the admin

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _check_email_format(v)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return _check_phone_10_digits(v)

    @field_validator("role", mode="before")
    @classmethod
    def parse_role(cls, v: Any) -> Any:
        return v.lower() if isinstance(v, str) else v


class AdminSetPasswordRequest(BaseModel):
    password: str = Field(min_length=8)


class OtpRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _check_email_format(v)


class UserLoginRequest(BaseModel):
    email: str
    password: str


class PasswordSetupRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _check_email_format(v)


class ResetPasswordWithOtpRequest(BaseModel):
    email: str
    otp: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return _check_email_format(v)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class StaffCreateResponse(BaseModel):
    user: UserOut
    auth_mode: str
    password_setup_url: Optional[str] = None  # local mode: share with the staff member
