from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core import security
from app.core.security import require_role
from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.schemas.user import StaffCreateRequest, StaffCreateResponse, UserUpdate, UserOut
from app.services import audit_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserOut])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
):
    query = db.query(User)
    if role:
        try:
            target_role = UserRole(role.lower())
            query = query.filter(User.role == target_role)
        except ValueError:
            pass
    return query.order_by(User.id.asc()).all()


@router.post("", response_model=StaffCreateResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: StaffCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Admin-only staff account creation. Creates the identity account (Firebase or local) plus the DB row.
    Firebase mode: the admin UI then triggers Firebase's password-reset email for the new user.
    Local mode: returns a one-time password setup link to hand to the staff member.
    """
    if payload.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=400, detail="Customers register themselves through the portal")
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        role=payload.role,
        firebase_uid=security.create_auth_account(email, payload.full_name),
        phone=payload.phone,
        hourly_rate=payload.hourly_rate if payload.role == UserRole.TECHNICIAN else 0,
        is_active=payload.is_active,
    )
    db.add(user)
    db.flush()
    db.add(AuditLog(record_type="user", record_id=user.id, action="USER_CREATED", to_status=user.role.value,
                    notes=f"Staff account {email} created with role {user.role.value}.", user_id=current_user.id))
    db.commit()
    db.refresh(user)
    setup_url = None
    if security.AUTH_MODE == "local":
        setup_url = f"/set-password?token={security.issue_password_setup_token(user.firebase_uid)}"
    return StaffCreateResponse(user=user, auth_mode=security.AUTH_MODE, password_setup_url=setup_url)


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    if user.id == current_user.id and (update_data.get("is_active") is False or update_data.get("role", UserRole.ADMIN) != UserRole.ADMIN):
        raise HTTPException(status_code=400, detail="You cannot deactivate or demote your own admin account")
    audit_service.apply_changes(db, "user", user, update_data, current_user.id)

    db.commit()
    db.refresh(user)
    return user

