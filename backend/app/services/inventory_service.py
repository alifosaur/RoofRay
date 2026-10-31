from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.inventory import StockMovement, MovementType, PickList, PickListLine
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.audit import AuditLog
from app.schemas.inventory import StockMovementCreate


def record_purchase_movement(db: Session, payload: StockMovementCreate, current_user_id: int) -> StockMovement:
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    movement = StockMovement(
        product_id=product.id,
        movement_type=MovementType.PURCHASE,
        quantity=payload.quantity,
        unit_cost=payload.unit_cost,
        reference=payload.reference or "Manual PO / Purchase Receipt",
    )
    db.add(movement)

    # Increase product stock quantity
    product.stock_quantity += payload.quantity

    audit = AuditLog(
        record_type="inventory",
        record_id=product.id,
        action="STOCK_PURCHASED",
        from_status=None,
        to_status=f"Stock: {product.stock_quantity}",
        notes=f"Inward stock received: +{payload.quantity} units of {product.name} @ ₹{payload.unit_cost:,.2f}.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(movement)
    return movement


def pack_pick_list(db: Session, pick_list_id: int, current_user_id: int) -> PickList:
    pick_list = db.query(PickList).filter(PickList.id == pick_list_id).first()
    if not pick_list:
        raise HTTPException(status_code=404, detail="Pick list not found")

    if pick_list.status == "PACKED":
        raise HTTPException(status_code=400, detail="Pick list is already packed")

    # Mark all lines as picked
    for line in pick_list.lines:
        line.picked_qty = line.required_qty
        # Deduct from product stock
        prod = line.product
        if prod:
            prod.stock_quantity = max(0, prod.stock_quantity - line.required_qty)
            # Create issue movement
            movement = StockMovement(
                product_id=prod.id,
                movement_type=MovementType.ISSUE,
                quantity=line.required_qty,
                unit_cost=prod.cost_price,
                reference=f"Order {pick_list.order.order_number}",
            )
            db.add(movement)

    pick_list.status = "PACKED"
    pick_list.packed_at = datetime.utcnow()

    # Update Order status to PACKED
    order = pick_list.order
    if order and order.status == OrderStatus.CONFIRMED:
        order.status = OrderStatus.PACKED
        audit = AuditLog(
            record_type="order",
            record_id=order.id,
            action="ORDER_PACKED",
            from_status=OrderStatus.CONFIRMED.value,
            to_status=OrderStatus.PACKED.value,
            notes=f"Warehouse completed packing for {order.order_number}. Ready for serial assignment & dispatch.",
            user_id=current_user_id,
        )
        db.add(audit)

    db.commit()
    db.refresh(pick_list)
    return pick_list
