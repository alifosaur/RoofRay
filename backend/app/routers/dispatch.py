from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.serial import SerialItem, SerialStatus
from app.schemas.serial import SerialItemRegister, SerialScanRequest, SerialItemOut
from app.schemas.order import OrderOut
from app.models.order import Order, OrderStatus
from app.services import dispatch_service, ticket_service

router = APIRouter(prefix="/dispatch", tags=["Dispatch & Barcode Scanning"])


@router.get("/queue", response_model=List[OrderOut])
def get_warehouse_order_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """Warehouse fulfillment queue: returns orders in CONFIRMED, PACKING, PACKED, DISPATCHED, or OUT_FOR_DELIVERY."""
    return db.query(Order).filter(
        Order.status.in_([
            OrderStatus.CONFIRMED,
            OrderStatus.PACKING,
            OrderStatus.PACKED,
            OrderStatus.DISPATCHED,
            OrderStatus.OUT_FOR_DELIVERY,
        ])
    ).order_by(Order.created_at.asc()).all()


from pydantic import BaseModel


class StageUpdateRequest(BaseModel):
    status: Optional[OrderStatus] = None
    stage: Optional[str] = None


@router.put("/orders/{order_id}/stage", response_model=OrderOut)
def advance_order_stage(
    order_id: int,
    status: Optional[OrderStatus] = None,
    payload: Optional[StageUpdateRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """
    Updates order fulfillment stage: PACKING -> DISPATCHED -> OUT_FOR_DELIVERY -> DELIVERED.
    Enforces dispatch gate (all serialized BOM units must be scanned).
    """
    target_status = status
    if payload:
        if payload.status:
            target_status = payload.status
        elif payload.stage:
            try:
                target_status = OrderStatus(payload.stage.upper())
            except ValueError:
                pass

    if not target_status:
        raise HTTPException(status_code=400, detail="Target stage/status required")

    return dispatch_service.update_order_stage(db, order_id, target_status, current_user.id)


@router.get("/lookup")
def lookup_serial_warranty(
    query: Optional[str] = None,
    serial_no: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN, UserRole.TECHNICIAN)),
):
    """Barcode & serial stock lookup: returns product, status, customer, warranty dates, and service history."""
    target_q = query or serial_no or ""
    return ticket_service.lookup_customer_support(db, target_q)



@router.post("/serials/register", status_code=status.HTTP_201_CREATED)
def register_serials(
    payload: SerialItemRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """Inward serial numbers into warehouse inventory."""
    items = dispatch_service.register_serials(db, payload, current_user.id)
    return {"message": f"Successfully registered {len(items)} serial items."}


@router.get("/serials", response_model=List[SerialItemOut])
def list_serials(
    product_id: Optional[int] = None,
    order_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    status: Optional[SerialStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists registered serial items with warranty and order details."""
    query = db.query(SerialItem)
    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else -1
        query = query.filter(SerialItem.customer_id == cust_id)
    elif customer_id and current_user.role == UserRole.ADMIN:
        query = query.filter(SerialItem.customer_id == customer_id)

    if product_id:
        query = query.filter(SerialItem.product_id == product_id)
    if order_id:
        query = query.filter(SerialItem.order_id == order_id)
    if status:
        query = query.filter(SerialItem.status == status)
    return query.order_by(SerialItem.created_at.desc()).all()


@router.post("/scan", response_model=SerialItemOut)
def scan_serial_to_order(
    payload: SerialScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """
    Scans a serial number to link it to an order.
    Rejects duplicates and already-assigned serials.
    """
    return dispatch_service.scan_serial_for_order(db, payload, current_user.id)


@router.post("/orders/{order_id}/deliver", response_model=OrderOut)
def deliver_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """
    Confirms order delivery.
    GATE: Blocks delivery (HTTP 400) until every serialized BOM item has been scanned.
    AUTO-WARRANTY: Sets delivered_on = today and warranty_end = delivered_on + warranty_years.
    """
    return dispatch_service.deliver_order(db, order_id, current_user.id)



@router.post("/orders/{order_id}/scan-all")
def scan_all_serials(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """Links all remaining serialised units of the order (registered stock first, then AUTO- placeholders)."""
    return dispatch_service.scan_all_for_order(db, order_id, current_user.id)
