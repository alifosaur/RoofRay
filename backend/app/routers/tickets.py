from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus
from app.schemas.ticket import TicketCreate, TicketResolveRequest, TicketOut, WarrantyLookupResult
from app.services import ticket_service

router = APIRouter(prefix="/tickets", tags=["Helpdesk & Warranty After-Sales"])


@router.get("/lookup", response_model=List[WarrantyLookupResult])
def lookup_warranty(
    query: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    After-sales support lookup:
    Returns customer, exact product serial, warranty status (in/out, days left),
    install date, and service history in one screen.
    """
    return ticket_service.lookup_customer_support(db, query)


@router.get("", response_model=List[TicketOut])
def list_tickets(
    status: Optional[TicketStatus] = None,
    customer_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Ticket)
    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else -1
        query = query.filter(Ticket.customer_id == cust_id)
    elif current_user.role == UserRole.TECHNICIAN:
        query = query.filter(Ticket.assigned_to_id == current_user.id)
    elif customer_id and current_user.role == UserRole.ADMIN:
        query = query.filter(Ticket.customer_id == customer_id)

    if status:
        query = query.filter(Ticket.status == status)
    if assigned_to_id and current_user.role in (UserRole.ADMIN, UserRole.SALES):
        query = query.filter(Ticket.assigned_to_id == assigned_to_id)
    return query.order_by(Ticket.created_at.desc()).all()


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else -1
        if ticket.customer_id != cust_id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only view your own support tickets")
    elif current_user.role == UserRole.TECHNICIAN:
        if ticket.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only view tickets assigned to you")

    return ticket


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES, UserRole.CUSTOMER)),
):
    """
    Creates ticket. Automatically evaluates warranty:
    In-warranty -> billable = False (Free repair/service)
    Out-of-warranty -> billable = True (Parts & labor will be billed).
    """
    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else None
        if not cust_id or payload.customer_id != cust_id:
            # Overwrite customer_id to authenticated customer's id
            payload.customer_id = cust_id
    return ticket_service.create_ticket(db, payload, current_user.id)


@router.put("/{ticket_id}/resolve", response_model=TicketOut)
def resolve_ticket(
    ticket_id: int,
    payload: TicketResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES, UserRole.TECHNICIAN)),
):
    """
    Resolves ticket.
    If billable: automatically generates repair invoice for parts & labour.
    """
    return ticket_service.resolve_ticket(db, ticket_id, payload, current_user.id)


@router.post("/{ticket_id}/customer-confirm", response_model=TicketOut)
def customer_confirm(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SALES)),
):
    """Records customer satisfaction confirmation."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else -1
        if ticket.customer_id != cust_id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only confirm your own ticket")

    return ticket_service.customer_confirm_ticket(db, ticket_id, current_user.id)


@router.post("/{ticket_id}/close", response_model=TicketOut)
def close_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
):
    """
    GATE: Blocks closure (HTTP 400) if ticket is not CUSTOMER_CONFIRMED.
    """
    return ticket_service.close_ticket(db, ticket_id, current_user.id)

