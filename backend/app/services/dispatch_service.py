from datetime import datetime, date
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.serial import SerialItem, SerialStatus
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.audit import AuditLog
from app.schemas.serial import SerialItemRegister, SerialScanRequest
from sqlalchemy.exc import IntegrityError
from app.core import cache, events
from app.models.user import UserRole


def add_years_to_date(orig_date: date, years: int) -> date:
    """Safely adds years to a date, handling leap year Feb 29 -> Feb 28."""
    try:
        return orig_date.replace(year=orig_date.year + years)
    except ValueError:
        return orig_date.replace(year=orig_date.year + years, day=28)


def register_serials(db: Session, payload: SerialItemRegister, current_user_id: int):
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    created = []
    for s_no in payload.serial_numbers:
        clean_s = s_no.strip()
        if not clean_s:
            continue
        existing = db.query(SerialItem).filter(SerialItem.serial_no == clean_s).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Serial number '{clean_s}' already exists in registry.",
            )
        item = SerialItem(
            serial_no=clean_s,
            product_id=product.id,
            status=SerialStatus.IN_STOCK,
        )
        db.add(item)
        created.append(item)

    db.commit()
    return created


STAGE_SEQUENCE = [
    OrderStatus.CONFIRMED, OrderStatus.PACKING, OrderStatus.PACKED,
    OrderStatus.DISPATCHED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED,
]


def missing_serialised(db: Session, order: Order) -> list:
    missing = []
    for q_line in order.quote.lines:
        prod = q_line.product
        if prod and prod.is_serialised:
            scanned = db.query(SerialItem).filter(SerialItem.order_id == order.id, SerialItem.product_id == prod.id).count()
            if scanned < q_line.quantity:
                missing.append(f"{prod.name} (Required: {q_line.quantity}, Scanned: {scanned})")
    return missing


def _stage_event(db: Session, order: Order, new_status: OrderStatus) -> None:
    lead = order.quote.lead if order.quote else None
    events.emit(
        db, "order.stage_changed", {"order_id": order.id, "status": new_status.value},
        user_ids=[order.customer.user_id if order.customer else None, lead.assigned_to_id if lead else None],
        roles=[UserRole.WAREHOUSE, UserRole.ADMIN],
        title=f"Order {order.order_number}: {new_status.value.replace('_', ' ').title()}",
        message=f"Your solar order is now {new_status.value.replace('_', ' ').lower()}.",
        link="/customer",
    )


def scan_serial_for_order(db: Session, payload: SerialScanRequest, current_user_id: int) -> SerialItem:
    clean_serial = payload.serial_no.strip()
    # Redis lock stops two scanners claiming the same serial; the unique serial_no + order check is the DB guard
    with cache.lock(f"serial:{clean_serial.upper()}"):
        return _scan(db, payload.order_id, clean_serial, current_user_id)


def _scan(db: Session, order_id: int, clean_serial: str, current_user_id: int) -> SerialItem:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    serial_item = db.query(SerialItem).filter(SerialItem.serial_no == clean_serial).first()
    if not serial_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Serial number '{clean_serial}' not found in registry.",
        )
    if serial_item.order_id and serial_item.order_id != order.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Serial number '{clean_serial}' is already assigned to another order/customer.",
        )
    if serial_item.order_id == order.id:
        raise HTTPException(status_code=400, detail=f"Serial number '{clean_serial}' was already scanned for this order.")
    if serial_item.status != SerialStatus.IN_STOCK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Serial number '{clean_serial}' is not in stock (status '{serial_item.status.value}').",
        )
    quote_line = next((ql for ql in order.quote.lines if ql.product_id == serial_item.product_id), None)
    if not quote_line:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{serial_item.product.name}' is not part of Order {order.order_number}.",
        )
    scanned_for_prod = db.query(SerialItem).filter(
        SerialItem.order_id == order.id, SerialItem.product_id == serial_item.product_id
    ).count()
    if scanned_for_prod >= quote_line.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Required quantity ({quote_line.quantity}) of '{serial_item.product.name}' has already been scanned.",
        )
    if order.status not in (OrderStatus.CONFIRMED, OrderStatus.PACKING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Serials are scanned while packing; order {order.order_number} is {order.status.value}.",
        )

    serial_item.order_id = order.id
    serial_item.customer_id = order.customer_id
    serial_item.status = SerialStatus.ALLOCATED
    serial_item.scanned_at = datetime.utcnow()
    line = next((l for l in (order.pick_list.lines if order.pick_list else []) if l.product_id == serial_item.product_id), None)
    if line:
        line.picked_qty = min(line.required_qty, line.picked_qty + 1)
    if order.status == OrderStatus.CONFIRMED:  # first scan starts packing
        order.status = OrderStatus.PACKING
        db.add(AuditLog(record_type="order", record_id=order.id, action="ORDER_PACKING", from_status=OrderStatus.CONFIRMED.value,
                        to_status=OrderStatus.PACKING.value, notes="Packing started (first serial scanned).", user_id=current_user_id))
        _stage_event(db, order, OrderStatus.PACKING)

    db.add(AuditLog(
        record_type="serial",
        record_id=serial_item.id,
        action="SERIAL_SCANNED_TO_ORDER",
        from_status=SerialStatus.IN_STOCK.value,
        to_status=SerialStatus.ALLOCATED.value,
        notes=f"Scanned {serial_item.serial_no} ({serial_item.product.name}) for Order {order.order_number}.",
        user_id=current_user_id,
    ))
    events.emit(db, "serial.scanned", {"order_id": order.id, "serial_no": serial_item.serial_no}, roles=[UserRole.WAREHOUSE, UserRole.ADMIN])
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=f"Serial number '{clean_serial}' was just claimed by another scan.")
    db.refresh(serial_item)
    return serial_item


def deliver_order(db: Session, order_id: int, current_user_id: int) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # GATE: every serialised BOM item must be scanned
    missing_items = missing_serialised(db, order)
    if missing_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm delivery. Missing required serialized items: {', '.join(missing_items)}",
        )
    if order.status != OrderStatus.OUT_FOR_DELIVERY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only orders out for delivery can be marked delivered (current: {order.status.value}).",
        )

    # AUTOMATIC WARRANTY: start = delivery date, end = start + product warranty years (never typed)
    today = date.today()
    assigned_serials = db.query(SerialItem).filter(SerialItem.order_id == order.id).all()
    for serial in assigned_serials:
        serial.status = SerialStatus.DELIVERED
        serial.delivered_on = today
        serial.warranty_end = add_years_to_date(today, serial.product.warranty_years)

    old_status = order.status.value
    order.status = OrderStatus.DELIVERED
    order.delivered_at = datetime.utcnow()
    db.add(AuditLog(
        record_type="order",
        record_id=order.id,
        action="ORDER_DELIVERED",
        from_status=old_status,
        to_status=OrderStatus.DELIVERED.value,
        notes=f"Delivered to site. Warranties started for {len(assigned_serials)} serialised components.",
        user_id=current_user_id,
    ))
    _stage_event(db, order, OrderStatus.DELIVERED)

    # Release the installation job to its technician
    job = order.installation_job
    if job:
        events.emit(
            db, "job.released", {"job_id": job.id, "order_id": order.id},
            user_ids=[job.technician_id], roles=[UserRole.ADMIN],
            title="Installation job ready",
            message=f"Materials delivered for {order.customer.name}. The installation job is now on your schedule.",
            link="/technician",
        )
    db.commit()
    db.refresh(order)
    return order


def update_order_stage(db: Session, order_id: int, new_status: OrderStatus, current_user_id: int) -> Order:
    """Strict fulfilment sequence: CONFIRMED → PACKING → PACKED → DISPATCHED → OUT_FOR_DELIVERY → DELIVERED."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in STAGE_SEQUENCE[:-1] or new_status not in STAGE_SEQUENCE:
        raise HTTPException(status_code=400, detail=f"Order in status {order.status.value} cannot move to {new_status.value}")
    expected = STAGE_SEQUENCE[STAGE_SEQUENCE.index(order.status) + 1]
    if new_status != expected:
        raise HTTPException(status_code=400, detail=f"Next stage for this order is {expected.value}, not {new_status.value}")

    if new_status == OrderStatus.DELIVERED:
        return deliver_order(db, order_id, current_user_id)
    if new_status == OrderStatus.PACKED:
        from app.services import inventory_service
        inventory_service.pack_pick_list(db, order.pick_list.id, current_user_id)
        db.refresh(order)
        return order

    old_status = order.status.value
    order.status = new_status
    if new_status == OrderStatus.DISPATCHED:
        for s in order.serial_items:
            s.status = SerialStatus.DISPATCHED
    db.add(AuditLog(
        record_type="order",
        record_id=order.id,
        action=f"ORDER_{new_status.value}",
        from_status=old_status,
        to_status=new_status.value,
        notes=f"Warehouse updated order stage to {new_status.value}.",
        user_id=current_user_id,
    ))
    _stage_event(db, order, new_status)
    db.commit()
    db.refresh(order)
    return order
