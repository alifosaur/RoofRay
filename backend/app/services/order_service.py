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
from app.schemas.order import PaymentCreate


def confirm_order(db: Session, order_id: int, current_user_id: int) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only DRAFT orders can be confirmed. Current status: {order.status.value}",
        )

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

        # Notify technician
        if technician:
            notif_tech = Notification(
                user_id=technician.id,
                title="New Installation Job Scheduled",
                message=f"Job scheduled for {order.customer.name} at {order.customer.address} on {scheduled_install_date.strftime('%Y-%m-%d')}.",
                link=f"/jobs/{install_job.id}",
            )
            db.add(notif_tech)

    # 3. Notify warehouse staff
    warehouse_users = db.query(User).filter(User.role == UserRole.WAREHOUSE, User.is_active == True).all()
    for wh_user in warehouse_users:
        notif_wh = Notification(
            user_id=wh_user.id,
            title="New Order Confirmed: Pick List Ready",
            message=f"Pick list generated for {order.order_number} ({order.customer.name}).",
            link=f"/inventory/pick-lists",
        )
        db.add(notif_wh)

    # 4. Initialize subsidy tracking record
    from app.services import finance_service
    finance_service.get_or_create_subsidy_record(db, order.id)

    # 5. Audit log
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

    payment = Payment(
        order_id=order.id,
        amount=payload.amount,
        method=payload.method,
        transaction_ref=payload.transaction_ref,
        recorded_by_id=current_user_id,
    )
    db.add(payment)

    order.paid_amount += payload.amount

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

