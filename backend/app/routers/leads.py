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
from app.services import lead_service, audit_service
from app.core import events

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

    update_dict = payload.model_dump(exclude_unset=True)
    if "assigned_to_id" in update_dict and current_user.role != UserRole.ADMIN and update_dict["assigned_to_id"] != lead.assigned_to_id:
        raise HTTPException(status_code=403, detail="Only an admin can reassign leads")
    new_status = update_dict.get("status")
    if new_status and new_status != lead.status and current_user.role != UserRole.ADMIN:
        # Sales can only mark contact made or close as LOST; every other stage is driven by the workflow
        if new_status == LeadStatus.LOST:
            if lead.status == LeadStatus.WON or any(q.order for q in lead.quotes):
                raise HTTPException(status_code=400, detail="This lead already has an order and cannot be marked lost")
            if not (update_dict.get("lost_reason") or lead.lost_reason):
                raise HTTPException(status_code=400, detail="A reason is required to mark a lead LOST")
        elif not (new_status == LeadStatus.CONTACTED and lead.status == LeadStatus.NEW):
            raise HTTPException(status_code=400, detail=f"Lead stage {new_status.value} is set by the workflow, not manually")
    audit_service.apply_changes(db, "lead", lead, update_dict, current_user.id)
    events.emit(db, "lead.updated", {"lead_id": lead.id, "status": lead.status.value},
                user_ids=[lead.assigned_to_id, lead.customer.user_id if lead.customer else None], roles=[UserRole.ADMIN])

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
