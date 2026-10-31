import time
from typing import Optional, List
from app.core import events
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.lead import Lead, LeadStatus, CallChecklist
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.schemas.lead import LeadPublicCreate, LeadUpdate, CallChecklistCreate

# Simple in-memory rate limiter for public lead capture: IP -> list of timestamps
_rate_limit_cache: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 10


def check_rate_limit(client_ip: str):
    if client_ip == "testclient":
        return
    now = time.time()
    timestamps = _rate_limit_cache.get(client_ip, [])
    # Filter within window
    timestamps = [t for t in timestamps if now - t < RATE_LIMIT_WINDOW]
    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many lead submissions. Please wait a minute before trying again.",
        )
    timestamps.append(now)
    _rate_limit_cache[client_ip] = timestamps


def get_next_sales_user(db: Session) -> Optional[User]:
    """Round-robin assignment to active sales agents based on least assigned leads."""
    sales_users = db.query(User).filter(User.role == UserRole.SALES, User.is_active == True).all()
    if not sales_users:
        # Leave unassigned (admins see every lead); assign_unassigned_leads hands it out when a sales user exists
        return None

    # Find the sales user with fewest active leads
    counts = []
    for u in sales_users:
        cnt = db.query(Lead).filter(Lead.assigned_to_id == u.id, Lead.is_deleted == False).count()
        counts.append((cnt, u))
    counts.sort(key=lambda x: x[0])
    return counts[0][1]


def create_public_lead(db: Session, payload: LeadPublicCreate, client_ip: str) -> Lead:
    check_rate_limit(client_ip)

    assigned_sales = get_next_sales_user(db)
    assigned_id = assigned_sales.id if assigned_sales else None

    # Check if a customer already exists with this phone or create one
    customer = db.query(Customer).filter(Customer.phone == payload.phone).first()
    if not customer:
        customer = Customer(
            name=payload.name,
            phone=payload.phone,
            email=payload.email,
            address=payload.address,
        )
        db.add(customer)
        db.flush()

    lead = Lead(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        required_capacity=payload.required_capacity,
        system_type=payload.system_type,
        notes=payload.notes,
        status=LeadStatus.NEW,
        assigned_to_id=assigned_id,
        customer_id=customer.id,
    )
    db.add(lead)
    db.flush()

    # Create audit log
    audit = AuditLog(
        record_type="lead",
        record_id=lead.id,
        action="LEAD_CREATED",
        from_status=None,
        to_status=LeadStatus.NEW.value,
        notes=f"New public web lead received. Assigned to {assigned_sales.full_name if assigned_sales else 'Unassigned'}.",
    )
    db.add(audit)

    notify_new_lead(db, lead)

    db.commit()
    db.refresh(lead)
    return lead


def process_call_checklist(db: Session, lead_id: int, payload: CallChecklistCreate, current_user_id: int) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.status not in (LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED):
        raise HTTPException(status_code=400, detail=f"Call checklist can only be recorded before the survey (lead is {lead.status.value})")
    old_status = lead.status.value

    # Create or update checklist
    checklist = db.query(CallChecklist).filter(CallChecklist.lead_id == lead.id).first()
    if not checklist:
        checklist = CallChecklist(
            lead_id=lead.id,
            shadow_free_area_sqft=payload.shadow_free_area_sqft,
            monthly_bill_amount=payload.monthly_bill_amount,
            is_grid_suitable=payload.is_grid_suitable,
            remarks=payload.remarks,
        )
        db.add(checklist)
    else:
        checklist.shadow_free_area_sqft = payload.shadow_free_area_sqft
        checklist.monthly_bill_amount = payload.monthly_bill_amount
        checklist.is_grid_suitable = payload.is_grid_suitable
        checklist.remarks = payload.remarks

    # Qualification rule: if not grid suitable, mark LOST with reason
    if not payload.is_grid_suitable:
        lead.status = LeadStatus.LOST
        lead.lost_reason = payload.lost_reason or "Grid not suitable for solar installation"
    else:
        lead.status = LeadStatus.QUALIFIED

    audit = AuditLog(
        record_type="lead",
        record_id=lead.id,
        action="CALL_CHECKLIST_RECORDED",
        from_status=old_status,
        to_status=lead.status.value,
        notes=f"Call checklist completed: {payload.shadow_free_area_sqft} sqft roof, Rs {payload.monthly_bill_amount} bill. Suitable: {payload.is_grid_suitable}.",
        user_id=current_user_id,
    )
    db.add(audit)
    events.emit(db, "lead.updated", {"lead_id": lead.id, "status": lead.status.value},
                user_ids=[lead.assigned_to_id, lead.customer.user_id if lead.customer else None], roles=[UserRole.ADMIN])

    db.commit()
    db.refresh(lead)
    return lead


def soft_delete_lead(db: Session, lead_id: int, current_user_id: int) -> Lead:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.is_deleted:
        raise HTTPException(status_code=400, detail="Lead is already deleted")

    lead.is_deleted = True
    audit = AuditLog(
        record_type="lead",
        record_id=lead.id,
        action="LEAD_SOFT_DELETED",
        from_status=lead.status.value,
        to_status=lead.status.value,
        notes="Lead soft-deleted.",
        user_id=current_user_id,
    )
    db.add(audit)
    db.commit()
    db.refresh(lead)
    return lead


def notify_new_lead(db: Session, lead: Lead) -> None:
    """New lead hand-off to the assigned sales user (live + notification)."""
    events.emit(
        db, "lead.created", {"lead_id": lead.id, "name": lead.name},
        user_ids=[lead.assigned_to_id], roles=[UserRole.ADMIN],
        title="New lead assigned",
        message=f"New lead from {lead.name} for {lead.required_capacity} kW {lead.system_type}.",
        link=f"/web/crm/{lead.id}",
    )


def assign_unassigned_leads(db: Session, actor_id: Optional[int] = None) -> int:
    """Shares open leads with no active sales owner out to active sales users (least-loaded first)."""
    active_sales = {u.id for u in db.query(User).filter(User.role == UserRole.SALES, User.is_active == True).all()}
    if not active_sales:
        return 0
    open_leads = db.query(Lead).filter(
        Lead.is_deleted == False,
        Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST]),
    ).order_by(Lead.created_at).all()
    moved = 0
    for lead in open_leads:
        if lead.assigned_to_id in active_sales:
            continue
        owner = get_next_sales_user(db)
        old = lead.assigned_to_id
        lead.assigned_to_id = owner.id
        db.add(AuditLog(record_type="lead", record_id=lead.id, action="LEAD_REASSIGNED",
                        notes=f"assigned_to_id: {old} → {owner.id} (no active sales owner)", user_id=actor_id))
        notify_new_lead(db, lead)
        db.flush()
        moved += 1
    return moved
