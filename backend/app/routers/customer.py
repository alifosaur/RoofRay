from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.lead import Lead, LeadStatus, CallChecklist
from app.models.survey import Survey, SurveyStatus
from app.models.quote import Quote, QuoteStatus
from app.models.order import Order, OrderStatus
from app.models.job import InstallationJob, JobStatus
from app.models.serial import SerialItem, SerialStatus
from app.models.ticket import Ticket, TicketStatus
from app.models.finance import Invoice, SubsidyRecord, SubsidyStatus
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.scheme import GovernmentScheme
from app.models.bom import BOMTemplate
from app.schemas.customer import (
    CustomerEnquiryCreate,
    CustomerEnquiryResponse,
    CustomerTrackerOut,
    TrackerStage,
    CustomerEquipmentOut,
    CustomerTicketCreate,
    SubsidyEstimatorRequest,
    SubsidyEstimatorResponse,
    GovernmentSchemeOut,
    CustomerSubsidyOut,
)
from app.services import lead_service, quote_service, ticket_service, subsidy_service, audit_service
from app.core import events
from pydantic import BaseModel

router = APIRouter(prefix="/customer", tags=["Customer Portal"])


def _get_customer_profile(db: Session, current_user: User) -> Optional[Customer]:
    """Find customer profile linked to the current user."""
    cust = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not cust and current_user.email:
        cust = db.query(Customer).filter(Customer.email == current_user.email).first()
        if cust and not cust.user_id:
            cust.user_id = current_user.id
            db.commit()
            db.refresh(cust)
    if not cust and current_user.phone:
        cust = db.query(Customer).filter(Customer.phone == current_user.phone).first()
        if cust and not cust.user_id:
            cust.user_id = current_user.id
            db.commit()
            db.refresh(cust)
    return cust


FULFILMENT_ORDER = [
    OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.PACKED, OrderStatus.DISPATCHED,
    OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.INSTALLED, OrderStatus.CLOSED,
]


@router.post("/enquiry", response_model=CustomerEnquiryResponse, status_code=status.HTTP_201_CREATED)
def submit_customer_enquiry(
    payload: CustomerEnquiryCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Submit customer enquiry with details, measurements and preferred system.
    Auto-assigns sales user via round-robin, notifies sales over SSE/DB,
    and returns friendly confirmation message.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    lead_service.check_rate_limit(client_ip)

    # 1. Round-robin sales user assignment
    assigned_sales = lead_service.get_next_sales_user(db)
    assigned_id = assigned_sales.id if assigned_sales else None

    # 2. Find or create Customer
    cust = db.query(Customer).filter(
        (Customer.phone == payload.phone) | (Customer.email == payload.email)
    ).first()
    if not cust:
        cust = Customer(
            name=payload.name,
            phone=payload.phone,
            email=payload.email,
            address=f"{payload.address}, {payload.city or ''} {payload.state or ''} {payload.pincode or ''}".strip(),
        )
        db.add(cust)
        db.flush()

    # 3. Calculate roof area if length & width provided
    roof_area = payload.roof_area_sqft
    if not roof_area and payload.roof_length_ft and payload.roof_width_ft:
        roof_area = round(payload.roof_length_ft * payload.roof_width_ft, 2)

    # 4. Create Lead
    lead = Lead(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        property_type=payload.property_type,
        roof_type=payload.roof_type,
        roof_area_sqft=roof_area,
        shadow_free_area_sqft=payload.shadow_free_area_sqft,
        floor_number=payload.floor_number or 1,
        roof_direction=payload.roof_direction,
        monthly_bill_amount=payload.monthly_bill_amount,
        required_capacity=payload.preferred_capacity_kw,
        system_type=payload.preferred_system_type,
        notes=payload.notes,
        source="customer_portal",
        status=LeadStatus.NEW,
        customer_id=cust.id,
        assigned_to_id=assigned_id,
    )
    db.add(lead)
    db.flush()

    # 6. Audit & Notification
    audit = AuditLog(
        record_type="lead",
        record_id=lead.id,
        action="LEAD_CREATED",
        from_status=None,
        to_status=LeadStatus.NEW.value,
        notes=f"Customer enquiry submitted via portal for {payload.preferred_capacity_kw} kW {payload.preferred_system_type}. Assigned to {assigned_sales.full_name if assigned_sales else 'Unassigned'}.",
    )
    db.add(audit)

    lead_service.notify_new_lead(db, lead)

    db.commit()
    db.refresh(lead)

    return CustomerEnquiryResponse(
        message="Thank you! Our sales representative will contact you soon.",
        lead_id=lead.id,
        status=lead.status.value,
        assigned_sales_rep=assigned_sales.full_name if assigned_sales else None,
    )


@router.get("/tracker", response_model=CustomerTrackerOut)
def get_customer_tracker(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER, UserRole.ADMIN)),
):
    """
    Get 13-stage project tracker for the current customer:
    Enquiry received -> Sales contacted -> Survey scheduled -> Survey done ->
    Quotation ready -> Order confirmed -> Packing -> Dispatched -> Out for delivery ->
    Delivered -> Installation scheduled -> Installed -> Subsidy status.
    """
    cust = _get_customer_profile(db, current_user)
    if not cust and current_user.role == UserRole.ADMIN:
        cust = db.query(Customer).order_by(Customer.id.desc()).first()

    if not cust:
        return CustomerTrackerOut(
            current_stage_key="enquiry",
            current_stage_name="Enquiry received",
            stages=[
                TrackerStage(key="enquiry", title="Enquiry received", status="PENDING", description="Submit your rooftop solar enquiry")
            ],
        )

    # Resolve latest lead and order
    lead = db.query(Lead).filter(Lead.customer_id == cust.id).order_by(Lead.id.desc()).first()
    order = db.query(Order).filter(Order.customer_id == cust.id).order_by(Order.id.desc()).first()
    quote = (
        db.query(Quote).filter(Quote.customer_id == cust.id).order_by(Quote.id.desc()).first()
        if not order else order.quote
    )
    survey = lead.survey if lead else None
    checklist = lead.call_checklist if lead else None
    job = (
        db.query(InstallationJob).filter(InstallationJob.order_id == order.id).first()
        if order else None
    )
    subsidy = (
        db.query(SubsidyRecord).filter(SubsidyRecord.order_id == order.id).first()
        if order else None
    )

    # 13 stages definition
    stage_defs = [
        {"key": "enquiry", "title": "Enquiry received"},
        {"key": "sales_contacted", "title": "Sales contacted"},
        {"key": "survey_scheduled", "title": "Survey scheduled"},
        {"key": "survey_done", "title": "Survey done"},
        {"key": "quotation_ready", "title": "Quotation ready"},
        {"key": "order_confirmed", "title": "Order confirmed"},
        {"key": "packing", "title": "Packing"},
        {"key": "dispatched", "title": "Dispatched"},
        {"key": "out_for_delivery", "title": "Out for delivery"},
        {"key": "delivered", "title": "Delivered"},
        {"key": "installation_scheduled", "title": "Installation scheduled"},
        {"key": "installed", "title": "Installed"},
        {"key": "subsidy", "title": "Subsidy status"},
    ]

    # Evaluate completion flags & metadata per stage
    evaluations = {}

    # Stage 1: Enquiry received
    evaluations["enquiry"] = {
        "completed": lead is not None,
        "date": lead.created_at.strftime("%Y-%m-%d %H:%M") if lead else None,
        "desc": f"Enquiry logged for {lead.required_capacity} kW {lead.system_type}" if lead else "No active enquiry",
    }

    # Stage 2: Sales contacted
    sales_ok = lead is not None and (
        checklist is not None
        or lead.status in [LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.SURVEY_SCHEDULED, LeadStatus.SURVEY_APPROVED, LeadStatus.QUOTED, LeadStatus.WON]
    )
    evaluations["sales_contacted"] = {
        "completed": sales_ok,
        "date": checklist.created_at.strftime("%Y-%m-%d") if checklist else (lead.updated_at.strftime("%Y-%m-%d") if sales_ok else None),
        "desc": "Sales advisor reviewed roof parameters & shadow-free area" if sales_ok else "Sales advisor will review & call you",
    }

    # Stage 3: Survey scheduled
    survey_scheduled = survey is not None and survey.scheduled_date is not None
    evaluations["survey_scheduled"] = {
        "completed": survey_scheduled,
        "date": survey.scheduled_date.strftime("%Y-%m-%d") if (survey and survey.scheduled_date) else None,
        "desc": f"Technician visit assigned for {survey.scheduled_date}" if (survey and survey.scheduled_date) else "Site inspection visit scheduling",
    }

    # Stage 4: Survey done
    survey_approved = survey is not None and survey.status in (SurveyStatus.COMPLETED, SurveyStatus.APPROVED)
    evaluations["survey_done"] = {
        "completed": survey_approved,
        "date": survey.approved_at.strftime("%Y-%m-%d") if (survey and survey.approved_at) else (survey.updated_at.strftime("%Y-%m-%d") if survey else None),
        "desc": "Roof direction, tilt, cable run & structure approved" if survey_approved else "Site survey visit & manager sign-off",
    }

    # Stage 5: Quotation ready
    quote_ready = quote is not None and quote.status in (QuoteStatus.SENT, QuoteStatus.ACCEPTED)
    evaluations["quotation_ready"] = {
        "completed": quote_ready or order is not None,
        "date": quote.created_at.strftime("%Y-%m-%d") if quote else None,
        "desc": f"Quotation {quote.quote_number} generated (₹{quote.total_amount:,.2f})" if quote else "Engineering BOM & quotation generation",
    }

    # Stage 6: Order confirmed
    order_confirmed = order is not None and order.status != OrderStatus.DRAFT
    evaluations["order_confirmed"] = {
        "completed": order_confirmed,
        "date": order.confirmed_at.strftime("%Y-%m-%d") if (order and order.confirmed_at) else None,
        "desc": f"Sales Order {order.order_number} confirmed with advance payment" if order_confirmed else "Customer quotation approval & advance booking",
    }

    # Stage 7: Packing
    stage_idx = FULFILMENT_ORDER.index(order.status) if (order and order.status in FULFILMENT_ORDER) else -1
    packing_ok = stage_idx >= FULFILMENT_ORDER.index(OrderStatus.PACKED)
    evaluations["packing"] = {
        "completed": packing_ok,
        "date": order.updated_at.strftime("%Y-%m-%d") if packing_ok else None,
        "desc": "Hardware picking & serial number assignment in warehouse" if packing_ok else "Warehouse staging & scanning",
    }

    # Stage 8: Dispatched
    dispatched_ok = stage_idx >= FULFILMENT_ORDER.index(OrderStatus.DISPATCHED)
    evaluations["dispatched"] = {
        "completed": dispatched_ok,
        "date": order.updated_at.strftime("%Y-%m-%d") if dispatched_ok else None,
        "desc": "Vehicle loaded & transit manifest dispatched" if dispatched_ok else "Awaiting dispatch clearance",
    }

    # Stage 9: Out for delivery
    out_ok = stage_idx >= FULFILMENT_ORDER.index(OrderStatus.OUT_FOR_DELIVERY)
    evaluations["out_for_delivery"] = {
        "completed": out_ok,
        "date": order.updated_at.strftime("%Y-%m-%d") if out_ok else None,
        "desc": "Solar equipment out for site delivery" if out_ok else "Transit to installation premises",
    }

    # Stage 10: Delivered
    delivered_ok = order is not None and order.status in [OrderStatus.DELIVERED, OrderStatus.INSTALLED, OrderStatus.CLOSED]
    evaluations["delivered"] = {
        "completed": delivered_ok,
        "date": order.delivered_at.strftime("%Y-%m-%d") if (order and order.delivered_at) else None,
        "desc": "Panels & inverters delivered safely; warranty activated" if delivered_ok else "On-site delivery & barcode acceptance",
    }

    # Stage 11: Installation scheduled
    # The install job is released to the technician on delivery
    job_scheduled = job is not None and delivered_ok
    evaluations["installation_scheduled"] = {
        "completed": job_scheduled,
        "date": job.scheduled_date.strftime("%Y-%m-%d") if (job and job.scheduled_date) else None,
        "desc": f"Installation crew assigned for {job.scheduled_date}" if (job and job.scheduled_date) else "Installation crew assignment",
    }

    # Stage 12: Installed
    job_completed = job is not None and job.status == JobStatus.COMPLETED
    evaluations["installed"] = {
        "completed": job_completed,
        "date": job.finished_at.strftime("%Y-%m-%d %H:%M") if (job and job.finished_at) else None,
        "desc": "System mounted, wired, power generation tested & commissioned" if job_completed else "Rooftop mounting, wiring & testing",
    }

    # Stage 13: Subsidy status
    subsidy_disbursed = subsidy is not None and subsidy.status == SubsidyStatus.DISBURSED
    subsidy_active = subsidy is not None and subsidy.status not in [SubsidyStatus.NOT_APPLIED]
    evaluations["subsidy"] = {
        "completed": subsidy_disbursed,
        "date": subsidy.disbursed_date.strftime("%Y-%m-%d") if (subsidy and subsidy.disbursed_date) else (
            subsidy.approved_date.strftime("%Y-%m-%d") if (subsidy and subsidy.approved_date) else None
        ),
        "desc": f"National Solar Portal Status: {subsidy.status.value.replace('_', ' ')} (₹{subsidy.eligible_amount:,.0f})" if subsidy else "Government portal subsidy claim & DBT credit",
    }

    # Normalize sequential statuses: Find first not completed as CURRENT, previous as COMPLETED, next as PENDING
    current_key = "enquiry"
    current_title = "Enquiry received"
    found_current = False

    stages_out: List[TrackerStage] = []
    for s_def in stage_defs:
        key = s_def["key"]
        ev = evaluations[key]
        if ev["completed"] and not found_current:
            st = "COMPLETED"
        elif not found_current:
            st = "CURRENT"
            found_current = True
            current_key = key
            current_title = s_def["title"]
        else:
            st = "PENDING"

        stages_out.append(
            TrackerStage(
                key=key,
                title=s_def["title"],
                status=st,
                date=ev["date"],
                description=ev["desc"],
            )
        )

    if not found_current and stages_out:
        # All completed
        current_key = stages_out[-1].key
        current_title = stages_out[-1].title

    return CustomerTrackerOut(
        lead_id=lead.id if lead else None,
        order_id=order.id if order else None,
        system_size_kw=order.quote.template.capacity_kw if (order and order.quote and order.quote.template) else (lead.required_capacity if lead else 3.0),
        system_type=lead.system_type if lead else "On-Grid",
        current_stage_key=current_key,
        current_stage_name=current_title,
        stages=stages_out,
    )


@router.get("/quotes")
def get_customer_quotes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER, UserRole.ADMIN)),
):
    """List quotations for the logged-in customer."""
    cust = _get_customer_profile(db, current_user)
    if not cust and current_user.role == UserRole.ADMIN:
        cust = db.query(Customer).order_by(Customer.id.desc()).first()
    if not cust:
        return []

    # Drafts are internal to sales until sent
    quotes = db.query(Quote).filter(Quote.customer_id == cust.id, Quote.status != QuoteStatus.DRAFT).order_by(Quote.created_at.desc()).all()
    out = []
    for q in quotes:
        out.append({
            "id": q.id,
            "quote_number": q.quote_number,
            "lead_id": q.lead_id,
            "bom_name": q.template.name if q.template else "Custom",
            "capacity_kw": q.template.capacity_kw if q.template else 3.0,
            "system_type": q.template.system_type if q.template else "On-Grid",
            "status": q.status.value,
            "total_amount": q.total_amount,
            "subtotal": q.subtotal,
            "tax_amount": q.tax_amount,
            "created_at": q.created_at.strftime("%Y-%m-%d"),
            "valid_until": q.valid_until.strftime("%Y-%m-%d") if q.valid_until else None,
            "has_pdf": bool(q.pdf_path),
            "lines": [
                {
                    "product_name": l.product.name if l.product else "Item",
                    "sku": l.product.sku if l.product else "",
                    "quantity": l.quantity,
                    "unit_price": l.unit_price,
                    "subtotal": l.subtotal,
                }
                for l in q.lines
            ],
        })
    return out


@router.post("/quotes/{quote_id}/accept")
def accept_customer_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER, UserRole.ADMIN)),
):
    """Customer accepts the quote and auto-creates sales order."""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    cust = _get_customer_profile(db, current_user)
    if current_user.role == UserRole.CUSTOMER and (not cust or quote.customer_id != cust.id):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot accept another customer's quote")

    order = quote_service.accept_quote(db, quote_id, current_user.id)
    return {
        "message": f"Quote {quote.quote_number} accepted successfully!",
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status.value,
    }


@router.get("/orders")
def get_customer_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER, UserRole.ADMIN)),
):
    """List orders, payment status, and invoices for the logged-in customer."""
    cust = _get_customer_profile(db, current_user)
    if not cust and current_user.role == UserRole.ADMIN:
        cust = db.query(Customer).order_by(Customer.id.desc()).first()
    if not cust:
        return []

    orders = db.query(Order).filter(Order.customer_id == cust.id).order_by(Order.created_at.desc()).all()
    out = []
    for o in orders:
        payments = [
            {
                "id": p.id,
                "amount": p.amount,
                "payment_method": p.payment_method.value,
                "reference": p.reference_number,
                "date": p.created_at.strftime("%Y-%m-%d"),
            }
            for p in o.payments
        ]
        out.append({
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status.value,
            "total_amount": o.total_amount,
            "paid_amount": o.paid_amount,
            "balance_amount": o.total_amount - o.paid_amount,
            "created_at": o.created_at.strftime("%Y-%m-%d"),
            "delivery_date": o.delivered_at.strftime("%Y-%m-%d") if o.delivered_at else None,
            "payments": payments,
            "invoice": {
                "id": o.invoice.id,
                "invoice_number": o.invoice.invoice_number,
                "total_amount": o.invoice.total_amount,
                "status": o.invoice.status.value,
            } if o.invoice else None,
        })
    return out


@router.get("/equipment", response_model=List[CustomerEquipmentOut])
def get_customer_equipment(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER, UserRole.ADMIN)),
):
    """
    List installed serialized hardware (inverters, batteries, panels)
    with active warranty status, delivery dates, and remaining days.
    """
    cust = _get_customer_profile(db, current_user)
    if not cust and current_user.role == UserRole.ADMIN:
        cust = db.query(Customer).order_by(Customer.id.desc()).first()
    if not cust:
        return []

    items = db.query(SerialItem).filter(SerialItem.customer_id == cust.id).all()
    today = date.today()
    out: List[CustomerEquipmentOut] = []
    for item in items:
        days_rem = (item.warranty_end - today).days if item.warranty_end else None
        is_in = days_rem is not None and days_rem > 0
        out.append(
            CustomerEquipmentOut(
                id=item.id,
                serial_number=item.serial_no,
                product_name=item.product.name if item.product else "Solar Equipment",
                product_category=item.product.category.value if item.product else "HARDWARE",
                warranty_years=item.product.warranty_years if item.product else 2,
                delivered_on=item.delivered_on.strftime("%Y-%m-%d") if item.delivered_on else None,
                warranty_end=item.warranty_end.strftime("%Y-%m-%d") if item.warranty_end else None,
                days_remaining=days_rem,
                is_in_warranty=is_in,
            )
        )
    return out


@router.post("/tickets", status_code=status.HTTP_201_CREATED)
def raise_customer_ticket(
    payload: CustomerTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER, UserRole.ADMIN)),
):
    """Customer raises a service / warranty ticket on an installed solar item."""
    cust = _get_customer_profile(db, current_user)
    if not cust and current_user.role == UserRole.ADMIN:
        cust = db.query(Customer).order_by(Customer.id.desc()).first()
    if not cust:
        raise HTTPException(status_code=400, detail="Customer account not found")

    serial_item = None
    is_billable = False
    if payload.serial_item_id:
        serial_item = db.query(SerialItem).filter(
            SerialItem.id == payload.serial_item_id,
            SerialItem.customer_id == cust.id,
        ).first()
        if serial_item and serial_item.warranty_end:
            if serial_item.warranty_end < date.today():
                is_billable = True  # Out of warranty

    cnt = db.query(Ticket).count() + 1
    while True:
        ticket_no = f"TCK-{datetime.utcnow().year}-{cnt:04d}"
        if not db.query(Ticket).filter(Ticket.ticket_number == ticket_no).first():
            break
        cnt += 1

    ticket = Ticket(
        ticket_number=ticket_no,
        subject=payload.subject,
        description=payload.description,
        customer_id=cust.id,
        serial_item_id=serial_item.id if serial_item else None,
        status=TicketStatus.OPEN,
        is_billable=is_billable,
    )
    ticket_service.assign_first_technician(db, ticket)
    db.add(ticket)
    db.flush()

    audit = AuditLog(
        record_type="ticket",
        record_id=ticket.id,
        action="TICKET_RAISED",
        from_status=None,
        to_status=TicketStatus.OPEN.value,
        notes=f"Customer raised service request {ticket.ticket_number} for {'warranty item ' + serial_item.serial_no if serial_item else 'general service'}.",
        user_id=current_user.id,
    )
    db.add(audit)
    ticket_service.ticket_event(db, ticket, "raised by customer")
    db.commit()
    db.refresh(ticket)

    return {
        "message": f"Service ticket {ticket.ticket_number} created successfully. Our technician will reach out shortly.",
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "is_billable": ticket.is_billable,
        "status": ticket.status.value,
    }


@router.get("/packages")
def list_solar_packages(db: Session = Depends(get_db)):
    """Public package catalogue built from the BOM templates, product prices and the schemes table."""
    out = []
    for t in db.query(BOMTemplate).order_by(BOMTemplate.system_type.desc(), BOMTemplate.capacity_kw).all():
        gross = round(sum(l.quantity * l.product.sale_price for l in t.lines), 2)
        sub = subsidy_service.central_subsidy(db, t.capacity_kw, t.system_type)
        subsidy = sub["central"] + sub["state"]
        out.append({
            "id": t.id,
            "name": t.name,
            "system_type": t.system_type,
            "capacity_kw": t.capacity_kw,
            "description": t.description,
            "gross_price": gross,
            "subsidy_amount": subsidy,
            "net_price": round(max(0.0, gross - subsidy), 2),
            "subsidy_eligible": subsidy_service.is_grid_connected(t.system_type),
            # Same generation assumption as the estimator (~1,380 units per kW per year)
            "monthly_generation_units": round(t.capacity_kw * 115),
            "components": [
                {
                    "name": l.product.name,
                    "category": l.product.category.value,
                    "quantity": l.quantity,
                    "warranty_years": l.product.warranty_years,
                    "is_serialised": l.product.is_serialised,
                }
                for l in t.lines
            ],
        })
    return out


@router.get("/schemes", response_model=List[GovernmentSchemeOut])
def list_government_schemes(db: Session = Depends(get_db)):
    """List active government solar subsidy schemes (PM Surya Ghar, state subsidies)."""
    return db.query(GovernmentScheme).filter(GovernmentScheme.is_active == True).order_by(GovernmentScheme.id.asc()).all()


class SchemeIn(BaseModel):
    name: str
    description: str
    eligibility: str
    benefit_amounts: str
    how_to_apply: str
    official_link: str = "https://pmsuryaghar.gov.in"
    state: str = "National / All India"
    is_active: bool = True
    is_announcement: bool = False
    announcement_text: Optional[str] = None
    cfa_per_kw_first_2kw: float = 0.0
    cfa_per_kw_3rd_kw: float = 0.0
    cfa_max: float = 0.0
    state_topup_per_kw: float = 0.0
    grid_connected_only: bool = True


@router.get("/schemes/all", response_model=List[GovernmentSchemeOut])
def list_all_schemes(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    return db.query(GovernmentScheme).order_by(GovernmentScheme.id.asc()).all()


@router.post("/schemes", response_model=GovernmentSchemeOut, status_code=status.HTTP_201_CREATED)
def create_scheme(payload: SchemeIn, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.ADMIN))):
    scheme = GovernmentScheme(**payload.model_dump())
    db.add(scheme)
    db.flush()
    db.add(AuditLog(record_type="scheme", record_id=scheme.id, action="SCHEME_CREATED", notes=scheme.name, user_id=current_user.id))
    _announce_scheme(db, scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


@router.put("/schemes/{scheme_id}", response_model=GovernmentSchemeOut)
def update_scheme(scheme_id: int, payload: SchemeIn, db: Session = Depends(get_db),
                  current_user: User = Depends(require_role(UserRole.ADMIN))):
    scheme = db.query(GovernmentScheme).filter(GovernmentScheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    audit_service.apply_changes(db, "scheme", scheme, payload.model_dump(), current_user.id)
    _announce_scheme(db, scheme)
    db.commit()
    db.refresh(scheme)
    return scheme


def _announce_scheme(db: Session, scheme: GovernmentScheme) -> None:
    """Scheme updates are pushed to customers' portals (government scheme updates)."""
    events.emit(db, "scheme.updated", {"scheme_id": scheme.id}, roles=[UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SALES],
                title=f"Scheme update: {scheme.name}" if scheme.is_announcement else None,
                message=scheme.announcement_text or scheme.description[:200])


@router.post("/schemes/estimate", response_model=SubsidyEstimatorResponse)
def estimate_solar_subsidy(payload: SubsidyEstimatorRequest, db: Session = Depends(get_db)):
    """Subsidy estimate from the admin-managed schemes table and the catalogue package price."""
    kw = payload.capacity_kw
    sys_type = payload.system_type.strip()
    gross_cost = subsidy_service.package_price(db, kw, sys_type) or 0.0
    sub = subsidy_service.central_subsidy(db, kw, sys_type, payload.state)
    if not subsidy_service.is_grid_connected(sys_type):
        breakdown = "NOT eligible: central subsidy applies to grid-connected (On-Grid) systems only."
    else:
        breakdown = sub["breakdown"]

    # Generation assumption: ~1,380 units per kW per year at ₹7.50/unit
    annual_units = round(kw * 1380.0, 0)
    return SubsidyEstimatorResponse(
        capacity_kw=kw,
        system_type=sys_type,
        estimated_gross_cost=gross_cost,
        central_subsidy=sub["central"],
        state_subsidy=sub["state"],
        estimated_net_cost=round(max(0.0, gross_cost - sub["central"] - sub["state"]), 2),
        annual_savings_units=annual_units,
        annual_bill_savings=round(annual_units * 7.50, 0),
        is_eligible=sub["eligible"],
        subsidy_breakdown=breakdown,
        disclaimer="Estimate only. Confirm current amounts on the official portal; actual subsidy requires DISCOM feasibility and commissioning.",
        portal_url="https://pmsuryaghar.gov.in",
    )


@router.get("/subsidy", response_model=Optional[CustomerSubsidyOut])
def get_customer_subsidy(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER, UserRole.ADMIN)),
):
    """Get active government subsidy tracking record for the logged-in customer."""
    cust = _get_customer_profile(db, current_user)
    if not cust and current_user.role == UserRole.ADMIN:
        cust = db.query(Customer).order_by(Customer.id.desc()).first()
    if not cust:
        return None

    order = db.query(Order).filter(Order.customer_id == cust.id).order_by(Order.id.desc()).first()
    if not order:
        return None

    sub = db.query(SubsidyRecord).filter(SubsidyRecord.order_id == order.id).first()
    if not sub:
        return None

    return CustomerSubsidyOut(
        id=sub.id,
        application_no=sub.application_no,
        portal_name=sub.portal_name,
        status=sub.status.value,
        eligible_amount=sub.eligible_amount,
        sanctioned_amount=sub.sanctioned_amount or 0.0,
        disbursed_amount=sub.disbursed_amount,
        applied_date=sub.applied_date.strftime("%Y-%m-%d") if sub.applied_date else None,
        approved_date=sub.approved_date.strftime("%Y-%m-%d") if sub.approved_date else None,
        disbursed_date=sub.disbursed_date.strftime("%Y-%m-%d") if sub.disbursed_date else None,
        rejection_notes=sub.rejection_notes,
        remarks=sub.remarks,
        events=[
            {"status": e.status.value, "event_date": e.event_date.isoformat(), "reference_no": e.reference_no,
             "document_url": e.document_url, "notes": e.notes}
            for e in sub.events
        ],
    )
