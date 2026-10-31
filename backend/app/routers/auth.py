import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.schemas.user import UserOut, UserRegisterRequest, UserLoginRequest, AuthResponse

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
    """Return the profile of the currently authenticated user."""
    return _user_to_out(current_user)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Public self-registration endpoint.
    SECURITY INVARIANT:
    Self-registration creates ONLY role=customer and creates a linked customers row.
    Any attempt to set staff or admin roles is strictly rejected or overridden to customer.
    """
    email_clean = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists. Please sign in.",
        )

    # Generate UID if not provided via Firebase
    uid = payload.firebase_uid or f"cust_{uuid.uuid4().hex[:12]}"

    # FORCED ROLE: Always CUSTOMER!
    new_user = User(
        email=email_clean,
        full_name=payload.full_name.strip(),
        role=UserRole.CUSTOMER,
        phone=payload.phone.strip(),
        firebase_uid=uid,
        is_active=True,
    )
    db.add(new_user)
    db.flush()

    # Create or link customer record
    customer = db.query(Customer).filter(
        (Customer.phone == payload.phone.strip()) | (Customer.email == email_clean)
    ).first()
    if customer:
        customer.user_id = new_user.id
        if not customer.name:
            customer.name = payload.full_name.strip()
    else:
        customer = Customer(
            user_id=new_user.id,
            name=payload.full_name.strip(),
            phone=payload.phone.strip(),
            email=email_clean,
            address=payload.address or "Delhi NCR",
            city=payload.city or "Delhi NCR",
            pincode=payload.pincode or "110001",
        )
        db.add(customer)

    db.commit()
    db.refresh(new_user)

    return AuthResponse(
        access_token=new_user.firebase_uid,
        token_type="bearer",
        user=_user_to_out(new_user),
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Unified login endpoint for all roles.
    Supports email lookup with token issuance in dev/Firebase mode.
    """
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        if "@roofray.com" in email_clean:
            user = db.query(User).filter(User.email == email_clean.replace("@roofray.com", "@sunpower.com")).first()
        elif "@sunpower.com" in email_clean:
            user = db.query(User).filter(User.email == email_clean.replace("@sunpower.com", "@roofray.com")).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact an administrator.",
        )

    return AuthResponse(
        access_token=user.firebase_uid,
        token_type="bearer",
        user=_user_to_out(user),
    )


