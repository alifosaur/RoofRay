from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.lead import Lead, LeadStatus
from app.models.survey import SurveyStatus
from app.models.audit import AuditLog
from app.schemas.lead import (
    LeadPublicCreate,
    LeadUpdate,
    LeadOut,
    CallChecklistCreate,
    SubmitToWarehouseIn,
    SubmitToWarehouseOut,
)
from app.schemas.quote import QuoteCreate
from app.services import lead_service, survey_service, quote_service, order_service

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
    if current_user.role in (UserRole.TECHNICIAN, UserRole.WAREHOUSE):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Technicians and warehouse staff cannot view CRM leads",
        )

    query = db.query(Lead)
    if not include_deleted:
        query = query.filter(Lead.is_deleted == False)

    # Object-level access control: Customer can only view their own leads
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(
            (Lead.phone == current_user.phone) | (Lead.email == current_user.email)
        )
    elif assigned_to_id:
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
    # Automatically shift stage to SURVEY_APPROVED if linked survey is approved
    has_updates = False
    for l in leads:
        if l.survey and l.survey.status == SurveyStatus.APPROVED and l.status == LeadStatus.SURVEY_SCHEDULED:
            l.status = LeadStatus.SURVEY_APPROVED
            db.add(l)
            has_updates = True
    if has_updates:
        db.commit()
    return leads


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (UserRole.TECHNICIAN, UserRole.WAREHOUSE):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Technicians and warehouse staff cannot view CRM leads",
        )

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Object-level check: Customer can only view their own lead
    if current_user.role == UserRole.CUSTOMER:
        if (lead.phone != current_user.phone) and (lead.email != current_user.email):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You cannot view another customer's lead",
            )

    # Automatically shift stage to SURVEY_APPROVED if survey is approved
    if lead.survey and lead.survey.status == SurveyStatus.APPROVED and lead.status == LeadStatus.SURVEY_SCHEDULED:
        lead.status = LeadStatus.SURVEY_APPROVED
        db.commit()
        db.refresh(lead)

    return lead


@router.post("/{lead_id}/submit-to-warehouse", response_model=SubmitToWarehouseOut)
def submit_lead_items_to_warehouse(
    lead_id: int,
    payload: SubmitToWarehouseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """
    Salesman prepares quotation according to client from BOM template and
    directly dispatches the required item checklist to the warehouse.
    Generates Quote, Order, and Warehouse Pick List in one atomic workflow.
    """
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Verify survey is approved (or if scheduled/completed, approve it)
    if lead.survey:
        if lead.survey.status != SurveyStatus.APPROVED:
            survey_service.approve_survey(db, lead.survey.id, current_user.id)
    else:
        raise HTTPException(
            status_code=400,
            detail="Site survey must be scheduled and approved before sending items to warehouse.",
        )

    # 1. Create quote from BOM
    quote_payload = QuoteCreate(
        lead_id=lead.id,
        template_id=payload.template_id,
        subsidy_amount=payload.subsidy_amount,
        notes=payload.notes or f"Generated for {lead.name} based on approved site survey.",
    )
    quote = quote_service.create_quote_from_bom(db, quote_payload, current_user.id)

    # 2. Accept quote and create Order
    order = quote_service.accept_quote(db, quote.id, current_user.id)

    # 3. Confirm order to create warehouse pick list with required items
    order = order_service.confirm_order(db, order.id, current_user.id)

    pick_list_id = order.pick_list.id if order.pick_list else 0
    items_count = len(order.pick_list.lines) if order.pick_list else len(quote.lines)

    return SubmitToWarehouseOut(
        success=True,
        message=f"Item details sent to warehouse! Sales Order {order.order_number} confirmed and Pick List #{pick_list_id} generated.",
        quote_number=quote.quote_number,
        order_id=order.id,
        order_number=order.order_number,
        pick_list_id=pick_list_id,
        items_count=items_count,
    )


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
    return lead_service.soft_delete_lead(db, lead_id, current_user.id)


@router.post("/{lead_id}/checklist", response_model=LeadOut)
def record_call_checklist(
    lead_id: int,
    payload: CallChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """Records shadow-free roof area, electricity bill, and grid check."""
    return lead_service.process_call_checklist(db, lead_id, payload, current_user.id)


@router.get("/{lead_id}/chatter")
def get_lead_chatter(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns audit log trail for the lead to power Odoo chatter view."""
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

