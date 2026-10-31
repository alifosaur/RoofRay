from datetime import datetime, date
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.serial import SerialItem, SerialStatus
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.audit import AuditLog
from app.schemas.serial import SerialItemRegister, SerialScanRequest


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


def scan_serial_for_order(db: Session, payload: SerialScanRequest, current_user_id: int) -> SerialItem:
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    clean_serial = payload.serial_no.strip()
    serial_item = db.query(SerialItem).filter(SerialItem.serial_no == clean_serial).first()
    if not serial_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Serial number '{clean_serial}' not found in registry.",
        )

    # Reject if already assigned to another customer/order
    if serial_item.order_id and serial_item.order_id != order.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Serial number '{clean_serial}' is already assigned to another order/customer.",
        )
    if serial_item.status not in (SerialStatus.IN_STOCK, SerialStatus.ALLOCATED, SerialStatus.DISPATCHED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Serial number '{clean_serial}' is already in status '{serial_item.status.value}'.",
        )

    # Verify that this product is required by the order's quote lines
    quote_line = next((ql for ql in order.quote.lines if ql.product_id == serial_item.product_id), None)
    if not quote_line:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product '{serial_item.product.name}' is not part of Order {order.order_number}.",
        )

    # Check that we haven't already scanned more than the required quantity for this product
    scanned_for_prod = db.query(SerialItem).filter(
        SerialItem.order_id == order.id,
        SerialItem.product_id == serial_item.product_id
    ).count()

    if scanned_for_prod >= quote_line.quantity and serial_item.order_id != order.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Required quantity ({quote_line.quantity}) of '{serial_item.product.name}' has already been scanned.",
        )

    # Assign to order and customer
    serial_item.order_id = order.id
    serial_item.customer_id = order.customer_id
    serial_item.status = SerialStatus.DISPATCHED

    # Update order status to DISPATCHED if PACKED
    if order.status in (OrderStatus.PACKED, OrderStatus.CONFIRMED):
        order.status = OrderStatus.DISPATCHED

    audit = AuditLog(
        record_type="serial",
        record_id=serial_item.id,
        action="SERIAL_SCANNED_TO_ORDER",
        from_status=SerialStatus.IN_STOCK.value,
        to_status=SerialStatus.DISPATCHED.value,
        notes=f"Scanned {serial_item.serial_no} ({serial_item.product.name}) for Order {order.order_number}.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(serial_item)
    return serial_item


def deliver_order(db: Session, order_id: int, current_user_id: int) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # 1. ENFORCE DISPATCH GATE:
    # Every serialized item required by the BOM must have been scanned and assigned!
    missing_items = []
    for q_line in order.quote.lines:
        prod = q_line.product
        if prod.is_serialised:
            scanned_count = db.query(SerialItem).filter(
                SerialItem.order_id == order.id,
                SerialItem.product_id == prod.id
            ).count()
            if scanned_count < q_line.quantity:
                missing_items.append(f"{prod.name} (Required: {q_line.quantity}, Scanned: {scanned_count})")

    if missing_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm delivery. Missing required serialized items: {', '.join(missing_items)}",
        )

    # 2. AUTOMATIC WARRANTY CALCULATION:
    # On DELIVERED, automatically set delivered_on and warranty_end (delivered_on + warranty_years)
    # Zero manual date entry anywhere!
    today = date.today()
    assigned_serials = db.query(SerialItem).filter(SerialItem.order_id == order.id).all()
    for serial in assigned_serials:
        serial.status = SerialStatus.DELIVERED
        serial.delivered_on = today
        warranty_years = serial.product.warranty_years
        serial.warranty_end = add_years_to_date(today, warranty_years)

    old_status = order.status.value
    order.status = OrderStatus.DELIVERED
    order.delivered_at = datetime.utcnow()

    audit = AuditLog(
        record_type="order",
        record_id=order.id,
        action="ORDER_DELIVERED",
        from_status=old_status,
        to_status=OrderStatus.DELIVERED.value,
        notes=f"Order delivered to customer site. Warranties activated automatically for {len(assigned_serials)} serialized components.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(order)
    return order
