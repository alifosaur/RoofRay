from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.serial import SerialItem, SerialStatus
from app.schemas.serial import SerialItemRegister, SerialScanRequest, SerialItemOut
from app.schemas.order import OrderOut
from app.services import dispatch_service

router = APIRouter(prefix="/dispatch", tags=["Dispatch & Barcode Scanning"])


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
    if product_id:
        query = query.filter(SerialItem.product_id == product_id)
    if order_id:
        query = query.filter(SerialItem.order_id == order_id)
    if customer_id:
        query = query.filter(SerialItem.customer_id == customer_id)
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
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN, UserRole.TECHNICIAN)),
):
    """
    Confirms order delivery.
    GATE: Blocks delivery (HTTP 400) until every serialized BOM item has been scanned.
    AUTO-WARRANTY: Sets delivered_on = today and warranty_end = delivered_on + warranty_years.
    """
    return dispatch_service.deliver_order(db, order_id, current_user.id)
