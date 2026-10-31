from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.models.payment import Payment
from app.models.inventory import PickList, PickListLine
from app.models.job import InstallationJob, JobStatus
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.finance import Invoice, InvoiceLine, InvoiceType, InvoiceStatus
from app.schemas.order import PaymentCreate
from app.core import events


def confirm_order(db: Session, order_id: int, current_user_id: int) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only DRAFT orders can be confirmed. Current status: {order.status.value}",
        )
    if order.paid_amount <= 0:
        raise HTTPException(status_code=400, detail="Record the customer's advance or full payment before confirming the order")

    order.status = OrderStatus.CONFIRMED
    order.confirmed_at = datetime.utcnow()

    # 1. Automatically generate warehouse pick list from quote lines
    if not order.pick_list:
        pick_list = PickList(
            order_id=order.id,
            status="PENDING",
        )
        db.add(pick_list)
        db.flush()

        for q_line in order.quote.lines:
            # Only hardware products (exclude pure service if any)
            p_line = PickListLine(
                pick_list_id=pick_list.id,
                product_id=q_line.product_id,
                required_qty=q_line.quantity,
                picked_qty=0,
            )
            db.add(p_line)

    # 2. Automatically create an installation job on the crew schedule
    if not order.installation_job:
        # Find available technician (round-robin or first active technician)
        technician = db.query(User).filter(User.role == UserRole.TECHNICIAN, User.is_active == True).first()
        tech_id = technician.id if technician else current_user_id

        scheduled_install_date = datetime.utcnow() + timedelta(days=5)
        install_job = InstallationJob(
            order_id=order.id,
            technician_id=tech_id,
            scheduled_date=scheduled_install_date,
            status=JobStatus.SCHEDULED,
            notes=f"Installation job auto-created for Order {order.order_number}.",
        )
        db.add(install_job)
        db.flush()
        # The technician is notified when the warehouse marks the order DELIVERED (job release)

    # 3. Hand-off: pick list to the warehouse (live), status to the customer and sales owner
    events.emit(
        db, "order.confirmed", {"order_id": order.id, "pick_list_id": order.pick_list.id if order.pick_list else None},
        roles=[UserRole.WAREHOUSE, UserRole.ADMIN],
        title="New pick list",
        message=f"Order {order.order_number} confirmed for {order.customer.name}. Pick list ready.",
        link="/web/inventory?tab=picklists",
    )
    events.emit(
        db, "order.confirmed", {"order_id": order.id},
        user_ids=[order.customer.user_id, order.quote.lead.assigned_to_id if order.quote and order.quote.lead else None],
        title="Order confirmed",
        message=f"Order {order.order_number} is confirmed and has been sent to the warehouse.",
    )

    # 4. Initialize subsidy tracking record
    from app.services import finance_service
    finance_service.get_or_create_subsidy_record(db, order.id)

    # 5. Sales invoice from the quote so accounting sees the receivable
    if not order.invoice:
        quote = order.quote
        invoice = Invoice(
            invoice_number=f"INV-{order.order_number}",
            order_id=order.id,
            customer_id=order.customer_id,
            invoice_type=InvoiceType.SALES,
            status=InvoiceStatus.PAID if order.paid_amount >= order.total_amount else InvoiceStatus.ISSUED,
            subtotal=quote.subtotal if quote else order.total_amount,
            tax_amount=quote.tax_amount if quote else 0.0,
            total_amount=order.total_amount,
            due_date=(datetime.utcnow() + timedelta(days=15)).date(),
        )
        db.add(invoice)
        db.flush()
        for q_line in (quote.lines if quote else []):
            db.add(InvoiceLine(
                invoice_id=invoice.id,
                description=q_line.product.name if q_line.product else f"Product #{q_line.product_id}",
                quantity=q_line.quantity,
                unit_price=q_line.unit_price,
                amount=q_line.subtotal,
            ))

    # 6. Audit log
    audit = AuditLog(
        record_type="order",
        record_id=order.id,
        action="ORDER_CONFIRMED",
        from_status=OrderStatus.DRAFT.value,
        to_status=OrderStatus.CONFIRMED.value,
        notes=f"Order confirmed. Pick list, installation job, and subsidy tracking auto-created.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(order)
    return order


def record_payment(db: Session, order_id: int, payload: PaymentCreate, current_user_id: int) -> Payment:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    outstanding = round(order.total_amount - order.paid_amount, 2)
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")
    if payload.amount > outstanding + 0.01:
        raise HTTPException(status_code=400, detail=f"Payment exceeds outstanding balance of ₹{outstanding:,.2f}")

    payment = Payment(
        order_id=order.id,
        amount=payload.amount,
        method=payload.method,
        transaction_ref=payload.transaction_ref,
        recorded_by_id=current_user_id,
    )
    db.add(payment)

    order.paid_amount += payload.amount
    settle_if_fully_paid(db, order, current_user_id)
    events.emit(
        db, "order.payment", {"order_id": order.id, "amount": payload.amount},
        user_ids=[order.customer.user_id], roles=[UserRole.ADMIN],
        title="Payment received",
        message=f"₹{payload.amount:,.0f} received for {order.order_number}. Balance ₹{max(0.0, order.total_amount - order.paid_amount):,.0f}.",
    )

    audit = AuditLog(
        record_type="order",
        record_id=order.id,
        action="PAYMENT_RECORDED",
        from_status=order.status.value,
        to_status=order.status.value,
        notes=f"Payment received: ₹{payload.amount:,.2f} via {payload.method.value}. Ref: {payload.transaction_ref or 'N/A'}. Total paid: ₹{order.paid_amount:,.2f} / ₹{order.total_amount:,.2f}.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(payment)
    return payment



def settle_if_fully_paid(db: Session, order: Order, current_user_id: int) -> None:
    """Marks the sales invoice PAID once fully paid, and closes the order once it is also installed."""
    if order.paid_amount + 0.01 < order.total_amount:
        return
    if order.invoice and order.invoice.status == InvoiceStatus.ISSUED:
        order.invoice.status = InvoiceStatus.PAID
    if order.status == OrderStatus.INSTALLED:
        order.status = OrderStatus.CLOSED
        events.emit(db, "order.closed", {"order_id": order.id}, user_ids=[order.customer.user_id], roles=[UserRole.ADMIN])
        db.add(AuditLog(
            record_type="order",
            record_id=order.id,
            action="ORDER_CLOSED",
            from_status=OrderStatus.INSTALLED.value,
            to_status=OrderStatus.CLOSED.value,
            notes="Order installed and fully paid. Closed automatically.",
            user_id=current_user_id,
        ))
