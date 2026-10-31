from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core import access
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.lead import Lead, LeadStatus
from app.models.audit import AuditLog
from app.schemas.lead import (
    LeadPublicCreate,
    LeadUpdate,
    LeadOut,
    CallChecklistCreate,
)
from app.services import lead_service

router = APIRouter(prefix="/leads", tags=["Leads & CRM"])


@router.post("/public", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def submit_public_lead(payload: LeadPublicCreate, request: Request, db: Session = Depends(get_db)):
    """Unauthenticated public enquiry form endpoint for website."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    return lead_service.create_public_lead(db, payload, client_ip)


@router.get("", response_model=List[LeadOut])
def list_leads(
    status: Optional[LeadStatus] = None,
    assigned_to_id: Optional[int] = None,
    include_deleted: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN, UserRole.CUSTOMER)),
):
    query = access.scope_leads(db.query(Lead), current_user)
    if not include_deleted:
        query = query.filter(Lead.is_deleted == False)

    if assigned_to_id and current_user.role == UserRole.ADMIN:
        query = query.filter(Lead.assigned_to_id == assigned_to_id)

    if status:
        query = query.filter(Lead.status == status)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Lead.name.ilike(search_filter))
            | (Lead.phone.ilike(search_filter))
            | (Lead.email.ilike(search_filter))
        )
    leads = query.order_by(Lead.created_at.desc()).all()
    return leads


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    access.ensure_lead_access(lead, current_user)
    return lead


@router.put("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    access.ensure_lead_access(lead, current_user)

    old_status = lead.status.value
    update_dict = payload.model_dump(exclude_unset=True)

    for field, val in update_dict.items():
        setattr(lead, field, val)

    if "status" in update_dict and payload.status and payload.status.value != old_status:
        audit = AuditLog(
            record_type="lead",
            record_id=lead.id,
            action="STATUS_CHANGED",
            from_status=old_status,
            to_status=payload.status.value,
            notes=f"Lead status manually changed to {payload.status.value}",
            user_id=current_user.id,
        )
        db.add(audit)

    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", response_model=LeadOut)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """Soft-delete lead as required by business rules."""
    _ensure_lead(db, lead_id, current_user)
    return lead_service.soft_delete_lead(db, lead_id, current_user.id)


@router.post("/{lead_id}/checklist", response_model=LeadOut)
def record_call_checklist(
    lead_id: int,
    payload: CallChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """Records shadow-free roof area, electricity bill, and grid check."""
    _ensure_lead(db, lead_id, current_user)
    return lead_service.process_call_checklist(db, lead_id, payload, current_user.id)


@router.get("/{lead_id}/chatter")
def get_lead_chatter(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns audit log trail for the lead to power Odoo chatter view."""
    _ensure_lead(db, lead_id, current_user)
    logs = db.query(AuditLog).filter(
        AuditLog.record_type == "lead", AuditLog.record_id == lead_id
    ).order_by(AuditLog.created_at.desc()).all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "from_status": log.from_status,
            "to_status": log.to_status,
            "notes": log.notes,
            "user_id": log.user_id,
            "created_at": log.created_at,
        }
        for log in logs
    ]



def _ensure_lead(db: Session, lead_id: int, current_user: User) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    access.ensure_lead_access(lead, current_user)
    return lead
