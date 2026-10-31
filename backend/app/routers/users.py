from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.database import Base
from app.core.database import get_db
from app.core import security
from app.core.security import require_role
from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.models.survey import Survey, SurveyStatus
from app.models.job import InstallationJob, JobStatus
from app.schemas.user import AdminSetPasswordRequest, StaffCreateRequest, StaffCreateResponse, UserUpdate, UserOut
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
    if payload.password:
        security.set_account_password(user, payload.password)
    db.add(user)
    db.flush()
    db.add(AuditLog(record_type="user", record_id=user.id, action="USER_CREATED", to_status=user.role.value,
                    notes=f"Staff account {email} created with role {user.role.value}.", user_id=current_user.id))
    db.commit()
    db.refresh(user)
    setup_url = None
    if security.AUTH_MODE == "local" and not payload.password:
        setup_url = f"/set-password?token={security.issue_password_setup_token(user.firebase_uid)}"
    return StaffCreateResponse(user=user, auth_mode=security.AUTH_MODE, password_setup_url=setup_url)


@router.post("/{user_id}/password")
def admin_set_password(
    user_id: int,
    payload: AdminSetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin sets or resets a staff member's password (e.g. when the setup link was not used)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=400, detail="Customers manage their own password")
    security.set_account_password(user, payload.password)
    db.add(AuditLog(record_type="user", record_id=user.id, action="PASSWORD_SET_BY_ADMIN",
                    notes=f"Password set by {current_user.email}.", user_id=current_user.id))
    db.commit()
    return {"ok": True}


@router.get("/technicians/availability")
def technician_availability(
    start: Optional[date] = None,
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
):
    """Calendar view for assigning surveys: each technician's surveys and install jobs per day."""
    start = start or date.today()
    end = start + timedelta(days=min(max(days, 1), 31))
    lo, hi = datetime.combine(start, datetime.min.time()), datetime.combine(end, datetime.min.time())
    out = []
    for tech in db.query(User).filter(User.role == UserRole.TECHNICIAN, User.is_active == True).order_by(User.full_name).all():
        bookings = [
            {"type": "survey", "id": s.id, "at": s.scheduled_date, "label": s.lead.name if s.lead else "", "status": s.status.value}
            for s in db.query(Survey).filter(Survey.technician_id == tech.id, Survey.scheduled_date >= lo, Survey.scheduled_date < hi,
                                             Survey.status == SurveyStatus.SCHEDULED)
        ] + [
            {"type": "install", "id": j.id, "at": j.scheduled_date, "label": j.customer_name or "", "status": j.status.value}
            for j in db.query(InstallationJob).filter(InstallationJob.technician_id == tech.id, InstallationJob.scheduled_date >= lo,
                                                      InstallationJob.scheduled_date < hi,
                                                      InstallationJob.status.in_([JobStatus.SCHEDULED, JobStatus.IN_PROGRESS]))
        ]
        out.append({"technician_id": tech.id, "name": tech.full_name, "bookings": sorted(bookings, key=lambda b: b["at"])})
    return {"start": start, "end": end, "technicians": out}


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



# Rows that only point *at* the user and carry no business history; removed together with the user
_DISPOSABLE = {"notifications", "outbox_events"}


@router.delete("/{user_id}")
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Removes a staff account. With no work history it is deleted (and its login removed);
    otherwise it is deactivated so past leads, jobs, payments and audit entries stay intact.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot remove your own account")
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=400, detail="Customer accounts cannot be removed here; deactivate them instead")
    if user.role == UserRole.ADMIN and db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True, User.id != user.id).count() == 0:
        raise HTTPException(status_code=400, detail="Cannot remove the last active admin")

    history = []
    for table in Base.metadata.sorted_tables:
        if table.name in _DISPOSABLE:
            continue
        for col in table.columns:
            if any(fk.column.table.name == "users" for fk in col.foreign_keys):
                n = db.execute(select(func.count()).select_from(table).where(col == user.id)).scalar()
                if n:
                    history.append(f"{n} {table.name.replace('_', ' ')}")

    if history:
        user.is_active = False
        db.add(AuditLog(record_type="user", record_id=user.id, action="USER_DEACTIVATED",
                        notes=f"Removal requested; kept for history ({', '.join(history)}).", user_id=current_user.id))
        db.commit()
        return {"removed": False, "deactivated": True,
                "message": f"{user.full_name} has work history ({', '.join(history)}), so the account was deactivated instead of deleted. They can no longer sign in."}

    for name in _DISPOSABLE:
        table = Base.metadata.tables[name]
        for col in table.columns:
            if any(fk.column.table.name == "users" for fk in col.foreign_keys):
                db.execute(table.delete().where(col == user.id))
    db.add(AuditLog(record_type="user", record_id=user.id, action="USER_DELETED",
                    notes=f"{user.email} ({user.role.value}) deleted.", user_id=current_user.id))
    if security.AUTH_MODE == "firebase":
        try:
            from firebase_admin import auth as fb_auth
            fb_auth.delete_user(user.firebase_uid)
        except Exception as e:
            print(f"[WARN] Could not delete Firebase user {user.email}: {e}")
    db.delete(user)
    db.commit()
    return {"removed": True, "deactivated": False, "message": "User removed."}
