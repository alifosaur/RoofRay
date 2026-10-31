from datetime import datetime, date
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.ticket import Ticket, TicketStatus
from app.models.customer import Customer
from app.models.serial import SerialItem
from app.models.finance import Invoice, InvoiceType, InvoiceStatus, InvoiceLine
from app.models.audit import AuditLog
from app.schemas.ticket import TicketCreate, TicketResolveRequest, WarrantyLookupResult


def lookup_customer_support(db: Session, query_str: str) -> List[WarrantyLookupResult]:
    clean_q = query_str.strip()
    results = []

    # 1. Search by serial number
    serial_match = db.query(SerialItem).filter(SerialItem.serial_no.ilike(f"%{clean_q}%")).first()
    if serial_match and serial_match.customer:
        cust = serial_match.customer
        today = date.today()
        in_w = bool(serial_match.warranty_end and today <= serial_match.warranty_end)
        days = (serial_match.warranty_end - today).days if serial_match.warranty_end else 0

        history = db.query(Ticket).filter(Ticket.customer_id == cust.id).order_by(Ticket.created_at.desc()).all()
        return [
            WarrantyLookupResult(
                customer_id=cust.id,
                customer_name=cust.name,
                customer_phone=cust.phone,
                customer_address=cust.address,
                serial_id=serial_match.id,
                serial_no=serial_match.serial_no,
                product_name=serial_match.product.name if serial_match.product else "N/A",
                delivered_on=serial_match.delivered_on,
                warranty_end=serial_match.warranty_end,
                in_warranty=in_w,
                days_left=max(0, days),
                service_history=history,
            )
        ]

    # 2. Search by customer phone or name
    customers = db.query(Customer).filter(
        (Customer.phone.ilike(f"%{clean_q}%")) | (Customer.name.ilike(f"%{clean_q}%"))
    ).all()

    for cust in customers:
        serials = db.query(SerialItem).filter(SerialItem.customer_id == cust.id).all()
        history = db.query(Ticket).filter(Ticket.customer_id == cust.id).order_by(Ticket.created_at.desc()).all()
        today = date.today()

        if serials:
            for s in serials:
                in_w = bool(s.warranty_end and today <= s.warranty_end)
                days = (s.warranty_end - today).days if s.warranty_end else 0
                results.append(
                    WarrantyLookupResult(
                        customer_id=cust.id,
                        customer_name=cust.name,
                        customer_phone=cust.phone,
                        customer_address=cust.address,
                        serial_id=s.id,
                        serial_no=s.serial_no,
                        product_name=s.product.name if s.product else "N/A",
                        delivered_on=s.delivered_on,
                        warranty_end=s.warranty_end,
                        in_warranty=in_w,
                        days_left=max(0, days),
                        service_history=history,
                    )
                )
        else:
            results.append(
                WarrantyLookupResult(
                    customer_id=cust.id,
                    customer_name=cust.name,
                    customer_phone=cust.phone,
                    customer_address=cust.address,
                    in_warranty=False,
                    days_left=0,
                    service_history=history,
                )
            )

    return results


def create_ticket(db: Session, payload: TicketCreate, current_user_id: int) -> Ticket:
    customer = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Invariant: Creating ticket from serial sets billable = not in_warranty
    is_billable = True
    if payload.serial_item_id:
        serial = db.query(SerialItem).filter(SerialItem.id == payload.serial_item_id).first()
        if serial and serial.warranty_end:
            today = date.today()
            if today <= serial.warranty_end:
                is_billable = False  # In warranty: free service!

    count = db.query(Ticket).count() + 1
    ticket_number = f"TK-{datetime.utcnow().year}-{count:04d}"

    ticket = Ticket(
        ticket_number=ticket_number,
        customer_id=payload.customer_id,
        serial_item_id=payload.serial_item_id,
        subject=payload.subject,
        description=payload.description,
        status=TicketStatus.OPEN,
        is_billable=is_billable,
    )
    db.add(ticket)
    db.flush()

    audit = AuditLog(
        record_type="ticket",
        record_id=ticket.id,
        action="TICKET_CREATED",
        from_status=None,
        to_status=TicketStatus.OPEN.value,
        notes=f"Ticket {ticket.ticket_number} created. Billable: {ticket.is_billable} (In-warranty: {not ticket.is_billable}).",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(ticket)
    return ticket


def resolve_ticket(db: Session, ticket_id: int, payload: TicketResolveRequest, current_user_id: int) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_at = datetime.utcnow()
    ticket.resolution_notes = payload.resolution_notes

    total_cost = payload.parts_cost + payload.labour_cost
    ticket.repair_cost = total_cost

    # Invariant: Out of warranty means parts and labour are billed automatically as a repair invoice
    if ticket.is_billable and total_cost > 0:
        inv_count = db.query(Invoice).count() + 1
        invoice_number = f"INV-REP-{datetime.utcnow().year}-{inv_count:04d}"

        tax = round(total_cost * 0.18, 2)  # 18% GST on repair & service
        repair_invoice = Invoice(
            invoice_number=invoice_number,
            ticket_id=ticket.id,
            customer_id=ticket.customer_id,
            invoice_type=InvoiceType.REPAIR,
            status=InvoiceStatus.ISSUED,
            subtotal=total_cost,
            tax_amount=tax,
            total_amount=total_cost + tax,
            due_date=date.today(),
        )
        db.add(repair_invoice)
        db.flush()

        if payload.parts_cost > 0:
            db.add(InvoiceLine(
                invoice_id=repair_invoice.id,
                description="Replacement Parts / Hardware Component",
                quantity=1,
                unit_price=payload.parts_cost,
                amount=payload.parts_cost,
            ))
        if payload.labour_cost > 0:
            db.add(InvoiceLine(
                invoice_id=repair_invoice.id,
                description="Technical Service & Field Labour Charge",
                quantity=1,
                unit_price=payload.labour_cost,
                amount=payload.labour_cost,
            ))

    audit = AuditLog(
        record_type="ticket",
        record_id=ticket.id,
        action="TICKET_RESOLVED",
        from_status=TicketStatus.IN_PROGRESS.value,
        to_status=TicketStatus.RESOLVED.value,
        notes=f"Ticket resolved. Cost: ₹{total_cost:,.2f}. Billable: {ticket.is_billable}.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(ticket)
    return ticket


def customer_confirm_ticket(db: Session, ticket_id: int, current_user_id: int) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = ticket.status.value
    ticket.status = TicketStatus.CUSTOMER_CONFIRMED
    ticket.customer_confirmed_at = datetime.utcnow()

    audit = AuditLog(
        record_type="ticket",
        record_id=ticket.id,
        action="CUSTOMER_CONFIRMED",
        from_status=old_status,
        to_status=TicketStatus.CUSTOMER_CONFIRMED.value,
        notes="Customer confirmed resolution satisfaction.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(ticket)
    return ticket


def close_ticket(db: Session, ticket_id: int, current_user_id: int) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # ENFORCE GATE: Ticket cannot close without customer confirmation!
    if ticket.status != TicketStatus.CUSTOMER_CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticket cannot be closed without customer confirmation.",
        )

    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = datetime.utcnow()

    audit = AuditLog(
        record_type="ticket",
        record_id=ticket.id,
        action="TICKET_CLOSED",
        from_status=TicketStatus.CUSTOMER_CONFIRMED.value,
        to_status=TicketStatus.CLOSED.value,
        notes="Ticket closed after customer confirmation.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(ticket)
    return ticket

