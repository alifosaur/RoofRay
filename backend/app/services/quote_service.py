import uuid
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.lead import Lead, LeadStatus
from app.models.survey import Survey, SurveyStatus
from app.models.bom import BOMTemplate
from app.models.quote import Quote, QuoteStatus, QuoteLine
from app.models.order import Order, OrderStatus
from app.models.customer import Customer
from app.models.audit import AuditLog
from app.schemas.quote import QuoteCreate
from app.services.pdf_service import generate_quote_pdf
from app.models.product import Product
from app.models.user import UserRole
from app.core import events


def create_quote_from_bom(db: Session, payload: QuoteCreate, current_user_id: int) -> Quote:
    # 1. Fetch Lead
    lead = db.query(Lead).filter(Lead.id == payload.lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 2. ENFORCE GATE: Survey must be APPROVED
    survey = db.query(Survey).filter(Survey.lead_id == lead.id).first()
    if not survey or survey.status != SurveyStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Site survey must be APPROVED before creating a quote",
        )

    # 3. Fetch BOM Template
    template = db.query(BOMTemplate).filter(BOMTemplate.id == payload.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="BOM Template not found")

    # Generate Quote Number
    count = db.query(Quote).count() + 1
    while True:
        quote_number = f"QT-{datetime.utcnow().year}-{count:04d}"
        if not db.query(Quote).filter(Quote.quote_number == quote_number).first():
            break
        count += 1

    quote = Quote(
        quote_number=quote_number,
        lead_id=lead.id,
        customer_id=lead.customer_id,
        template_id=template.id,
        status=QuoteStatus.DRAFT,
        notes=payload.notes,
    )
    db.add(quote)
    db.flush()

    # 4. Explode BOM into QuoteLines
    subtotal = 0.0
    for bom_line in template.lines:
        prod = bom_line.product
        line_unit_price = prod.sale_price
        line_subtotal = bom_line.quantity * line_unit_price
        subtotal += line_subtotal

        q_line = QuoteLine(
            quote_id=quote.id,
            product_id=prod.id,
            quantity=bom_line.quantity,
            unit_price=line_unit_price,
            subtotal=line_subtotal,
        )
        db.add(q_line)

    # Subsidy calculation (PM Surya Ghar scheme default)
    if payload.subsidy_amount is not None:
        subsidy = payload.subsidy_amount
    else:
        from app.services import subsidy_service
        sub = subsidy_service.central_subsidy(db, template.capacity_kw, template.system_type, lead.state)
        subsidy = sub["central"] + sub["state"]

    # Taxes (13.8% composite solar GST)
    taxable_base = subtotal
    tax = round(taxable_base * 0.138, 2)
    total = max(0.0, round(subtotal - subsidy + tax, 2))

    quote.subtotal = subtotal
    quote.subsidy_amount = subsidy
    quote.tax_amount = tax
    quote.total_amount = total


    db.flush()
    db.refresh(quote)

    # 5. Generate Quote PDF
    customer = db.query(Customer).filter(Customer.id == quote.customer_id).first()
    try:
        pdf_path = generate_quote_pdf(quote, customer, lead, template.name)
        quote.pdf_path = pdf_path
    except Exception as e:
        print(f"[WARN] PDF generation failed: {e}")

    # Audit log
    audit = AuditLog(
        record_type="quote",
        record_id=quote.id,
        action="QUOTE_CREATED",
        from_status=None,
        to_status=QuoteStatus.DRAFT.value,
        notes=f"Quote {quote.quote_number} generated from {template.name} for Rs {quote.total_amount:,.2f}.",
        user_id=current_user_id,
    )
    db.add(audit)


    db.commit()
    db.refresh(quote)
    return quote


def accept_quote(db: Session, quote_id: int, current_user_id: int) -> Order:
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    if quote.status == QuoteStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Quote is already accepted")
    if quote.status != QuoteStatus.SENT:
        raise HTTPException(status_code=400, detail=f"Only a quotation sent to the customer can be accepted (current: {quote.status.value})")

    existing_order = db.query(Order).join(Quote, Order.quote_id == Quote.id).filter(Quote.lead_id == quote.lead_id).first()
    if existing_order:
        raise HTTPException(
            status_code=400,
            detail=f"This lead already has Sales Order {existing_order.order_number}.",
        )

    old_quote_status = quote.status.value
    quote.status = QuoteStatus.ACCEPTED

    # The lead stays SURVEY_APPROVED until installation is complete (then WON, see job_service.complete_job)
    lead = db.query(Lead).filter(Lead.id == quote.lead_id).first()

    # Auto-create Order in DRAFT status
    count = db.query(Order).count() + 1
    while True:
        order_number = f"SO-{datetime.utcnow().year}-{count:04d}"
        if not db.query(Order).filter(Order.order_number == order_number).first():
            break
        count += 1

    order = Order(
        order_number=order_number,
        quote_id=quote.id,
        customer_id=quote.customer_id,
        status=OrderStatus.DRAFT,
        total_amount=quote.total_amount,
        paid_amount=0.0,
        notes=f"Created upon acceptance of {quote.quote_number}",
    )
    db.add(order)
    db.flush()

    audit_quote = AuditLog(
        record_type="quote",
        record_id=quote.id,
        action="QUOTE_ACCEPTED",
        from_status=old_quote_status,
        to_status=QuoteStatus.ACCEPTED.value,
        notes=f"Accepted by customer. Sales Order {order.order_number} created.",
        user_id=current_user_id,
    )
    db.add(audit_quote)

    audit_order = AuditLog(
        record_type="order",
        record_id=order.id,
        action="ORDER_CREATED",
        from_status=None,
        to_status=OrderStatus.DRAFT.value,
        notes=f"Sales Order created from accepted quote {quote.quote_number}.",
        user_id=current_user_id,
    )
    db.add(audit_order)
    events.emit(
        db, "quote.accepted", {"quote_id": quote.id, "order_id": order.id},
        user_ids=[lead.assigned_to_id if lead else None, quote.customer.user_id if quote.customer else None],
        roles=[UserRole.ADMIN],
        title="Quotation accepted",
        message=f"{quote.quote_number} accepted. Sales Order {order.order_number} awaits payment and confirmation.",
        link=f"/web/orders/{order.id}",
    )

    # Competing quotes for the same enquiry are closed so only one order reaches the warehouse
    for other in db.query(Quote).filter(Quote.lead_id == quote.lead_id, Quote.id != quote.id,
                                        Quote.status.in_([QuoteStatus.DRAFT, QuoteStatus.SENT])).all():
        other.status = QuoteStatus.REJECTED
        db.add(AuditLog(record_type="quote", record_id=other.id, action="QUOTE_SUPERSEDED", from_status=QuoteStatus.SENT.value,
                        to_status=QuoteStatus.REJECTED.value, notes=f"Superseded by accepted {quote.quote_number}.",
                        user_id=current_user_id))

    db.commit()
    db.refresh(order)
    # Acceptance confirms the order: pick list to the warehouse, invoice issued; payments are recorded afterwards
    from app.services import order_service
    return order_service.confirm_order(db, order.id, current_user_id, require_payment=False)


def _recompute_totals(quote: Quote) -> None:
    quote.subtotal = round(sum(l.subtotal for l in quote.lines), 2)
    quote.tax_amount = round(quote.subtotal * 0.138, 2)  # composite solar GST, same rate as create_quote_from_bom
    quote.total_amount = max(0.0, round(quote.subtotal - quote.subsidy_amount + quote.tax_amount, 2))


def update_quote_lines(db: Session, quote: Quote, lines: list, current_user_id: int) -> Quote:
    """Sales adjusts the auto-filled BOM before sending. Only DRAFT quotes can change."""
    if quote.status != QuoteStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft quotations can be edited")
    if not lines:
        raise HTTPException(status_code=400, detail="A quotation needs at least one line")
    before = ", ".join(f"{l.product.sku}×{l.quantity}" for l in quote.lines)
    quote.lines.clear()
    db.flush()
    for item in lines:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        price = item.unit_price if item.unit_price is not None else product.sale_price
        quote.lines.append(QuoteLine(product_id=product.id, quantity=item.quantity, unit_price=price, subtotal=round(price * item.quantity, 2)))
    db.flush()
    _recompute_totals(quote)
    after = ", ".join(f"{l.product.sku}×{l.quantity}" for l in quote.lines)
    db.add(AuditLog(record_type="quote", record_id=quote.id, action="QUOTE_LINES_EDITED",
                    notes=f"BOM changed: {before} → {after}. New total Rs {quote.total_amount:,.2f}.", user_id=current_user_id))
    _regenerate_pdf(db, quote)
    db.commit()
    db.refresh(quote)
    return quote


def send_quote(db: Session, quote: Quote, current_user_id: int) -> Quote:
    if quote.status != QuoteStatus.DRAFT:
        raise HTTPException(status_code=400, detail=f"Only draft quotations can be sent (current: {quote.status.value})")
    _regenerate_pdf(db, quote)
    quote.status = QuoteStatus.SENT
    db.add(AuditLog(record_type="quote", record_id=quote.id, action="QUOTE_SENT", from_status=QuoteStatus.DRAFT.value,
                    to_status=QuoteStatus.SENT.value, notes="Quotation PDF shared with the customer.", user_id=current_user_id))
    events.emit(
        db, "quote.sent", {"quote_id": quote.id, "lead_id": quote.lead_id},
        user_ids=[quote.customer.user_id if quote.customer else None], roles=[UserRole.ADMIN],
        title="Your quotation is ready",
        message=f"Quotation {quote.quote_number} for ₹{quote.total_amount:,.0f} is ready to review in your portal.",
        link="/customer",
    )
    db.commit()
    db.refresh(quote)
    return quote


def _regenerate_pdf(db: Session, quote: Quote) -> None:
    try:
        quote.pdf_path = generate_quote_pdf(quote, quote.customer, quote.lead, quote.template.name if quote.template else "Custom")
    except Exception as e:
        print(f"[WARN] PDF generation failed: {e}")

