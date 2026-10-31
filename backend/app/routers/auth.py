import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core import security
from app.core import mailer
from app.core.security import get_current_user
from app.models.email_otp import EmailOtp
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.schemas.user import (
    OtpRequest, UserOut, UserRegisterRequest, UserLoginRequest, AuthResponse, PasswordSetupRequest, ForgotPasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _user_to_out(user: User) -> UserOut:
    cust_id = user.customer_profile.id if user.customer_profile else None
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        phone=user.phone,
        hourly_rate=user.hourly_rate,
        is_active=user.is_active,
        firebase_uid=user.firebase_uid,
        customer_id=cust_id,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the profile (and role) of the currently authenticated user."""
    return _user_to_out(current_user)


OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


def _otp_hash(email: str, code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


@router.post("/register/request-otp")
def request_signup_otp(payload: OtpRequest, db: Session = Depends(get_db)):
    """Emails a 6-digit sign-up code (valid 10 minutes). One request per email per minute."""
    email = payload.email.lower().strip()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")
    last = db.query(EmailOtp).filter(EmailOtp.email == email).order_by(EmailOtp.id.desc()).first()
    if last and (datetime.utcnow() - last.created_at).total_seconds() < 60:
        raise HTTPException(status_code=429, detail="Please wait a minute before requesting another code")
    code = f"{secrets.randbelow(10**6):06d}"
    db.add(EmailOtp(email=email, purpose="signup", code_hash=_otp_hash(email, code),
                    expires_at=datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES)))
    db.commit()
    mailer.send_email(email, f"{settings.PROJECT_NAME} sign-up code: {code}",
                      f"Your verification code is {code}. It expires in {OTP_TTL_MINUTES} minutes.\n"
                      "If you did not request this, ignore this email.")
    return {"message": "Verification code sent", "expires_in_minutes": OTP_TTL_MINUTES}


def _consume_otp(db: Session, email: str, code: str) -> None:
    otp = (db.query(EmailOtp).filter(EmailOtp.email == email, EmailOtp.purpose == "signup", EmailOtp.used == False)
           .order_by(EmailOtp.id.desc()).first())
    if not otp or otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code expired or not requested. Send a new code.")
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Too many wrong attempts. Send a new code.")
    if not hmac.compare_digest(otp.code_hash, _otp_hash(email, code.strip())):
        otp.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect code")
    otp.used = True


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Public self-registration with an emailed code. ALWAYS creates role=customer with a linked customer profile."""
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")
    _consume_otp(db, email, payload.otp)

    new_user = User(
        email=email,
        full_name=payload.full_name.strip(),
        role=UserRole.CUSTOMER,
        phone=payload.phone.strip(),
        firebase_uid=security.create_auth_account(email, payload.full_name),
        password_hash=security.hash_password(payload.password),
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    # Link an existing customer record (e.g. from an earlier enquiry) or create one
    customer = db.query(Customer).filter(
        (Customer.phone == payload.phone.strip()) | (Customer.email == email)
    ).first()
    if customer and customer.user_id is None:
        customer.user_id = new_user.id
    elif not customer:
        db.add(Customer(user_id=new_user.id, name=payload.full_name.strip(), phone=payload.phone.strip(), email=email,
                        address=payload.address or "", city=payload.city, pincode=payload.pincode))

    db.commit()
    db.refresh(new_user)
    return AuthResponse(access_token=security.issue_session_token(new_user.firebase_uid), user=_user_to_out(new_user))


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Email + password sign-in."""
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not security.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Contact an administrator.")
    return AuthResponse(access_token=security.issue_session_token(user.firebase_uid), user=_user_to_out(user))


@router.post("/set-password", response_model=AuthResponse)
def set_password(payload: PasswordSetupRequest, db: Session = Depends(get_db)):
    """Local mode: completes the password-setup / reset link sent to a user."""
    uid = security.decode_local_token(payload.token, "password_setup")
    user = db.query(User).filter(User.firebase_uid == uid).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Account not found or inactive")
    user.password_hash = security.hash_password(payload.password)
    db.commit()
    return AuthResponse(access_token=security.issue_session_token(uid), user=_user_to_out(user))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Local mode: issues a reset link. Always answers the same way so emails cannot be enumerated."""
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if user and user.is_active:
        link = f"{settings.PUBLIC_APP_URL}/set-password?token={security.issue_password_setup_token(user.firebase_uid)}"
        mailer.send_email(user.email, f"{settings.PROJECT_NAME} password reset",
                          f"Set a new password here (valid 48 hours):\n{link}\n\nIf you did not ask for this, ignore this email.")
    return {"message": "If the account exists, a password reset link has been sent."}
