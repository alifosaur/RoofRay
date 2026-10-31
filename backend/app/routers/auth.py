from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core import security
from app.core.security import get_current_user, security_scheme
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.schemas.user import (
    UserOut, UserRegisterRequest, UserLoginRequest, AuthResponse, PasswordSetupRequest, ForgotPasswordRequest,
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


@router.get("/config")
def auth_config():
    """Tells the frontend which sign-in flow to use. Firebase web config values are public by design."""
    return {
        "mode": security.AUTH_MODE,
        "firebase": {
            "apiKey": settings.FIREBASE_WEB_API_KEY,
            "authDomain": settings.FIREBASE_WEB_AUTH_DOMAIN,
            "projectId": settings.FIREBASE_WEB_PROJECT_ID,
            "appId": settings.FIREBASE_WEB_APP_ID,
        } if security.AUTH_MODE == "firebase" else None,
    }


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the profile (and role) of the currently authenticated user."""
    return _user_to_out(current_user)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: UserRegisterRequest,
    auth_header: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
):
    """
    Public self-registration. ALWAYS creates role=customer with a linked customer profile.
    Firebase mode: the client creates the Firebase account first and sends its ID token.
    Local mode: email + password are sent in the body.
    """
    if security.AUTH_MODE == "firebase":
        if not auth_header:
            raise HTTPException(status_code=401, detail="Sign up with Firebase first, then send the ID token")
        decoded = security.verify_firebase_token(auth_header.credentials)
        uid, email = decoded["uid"], (decoded.get("email") or "").lower().strip()
        token = auth_header.credentials
    else:
        if not payload.email or not payload.password or len(payload.password) < 8:
            raise HTTPException(status_code=400, detail="Email and a password of at least 8 characters are required")
        uid, email = None, payload.email.lower().strip()
        token = None

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in.")

    new_user = User(
        email=email,
        full_name=payload.full_name.strip(),
        role=UserRole.CUSTOMER,
        phone=payload.phone.strip(),
        firebase_uid=uid or security.create_auth_account(email, payload.full_name),
        password_hash=security.hash_password(payload.password) if security.AUTH_MODE == "local" else None,
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
        db.add(Customer(
            user_id=new_user.id,
            name=payload.full_name.strip(),
            phone=payload.phone.strip(),
            email=email,
            address=payload.address or "",
            city=payload.city,
            pincode=payload.pincode,
        ))

    db.commit()
    db.refresh(new_user)
    return AuthResponse(access_token=token or security.issue_session_token(new_user.firebase_uid), user=_user_to_out(new_user))


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Local-mode email + password sign-in. In Firebase mode the client signs in with Firebase directly."""
    if security.AUTH_MODE == "firebase":
        raise HTTPException(status_code=400, detail="Sign in with Firebase; this endpoint is for local auth mode only")
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
    if user and user.is_active and security.AUTH_MODE == "local":
        link = f"/set-password?token={security.issue_password_setup_token(user.firebase_uid)}"
        # shortcut: no mail server is configured, so the link is logged for the operator; wire SMTP before going live
        print(f"[AUTH] Password reset link for {user.email}: {link}")
    return {"message": "If the account exists, a password reset link has been sent."}
