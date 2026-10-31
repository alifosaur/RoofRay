from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.schemas.order import OrderOut, PaymentCreate, PaymentOut
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["Sales Orders"])


WAREHOUSE_ALLOWED_STAGES = [
    OrderStatus.CONFIRMED,
    OrderStatus.PACKED,
    OrderStatus.DISPATCHED,
    OrderStatus.DELIVERED,
]


def _validate_order_access(order: Order, current_user: User):
    if current_user.role == UserRole.ADMIN:
        return
    if current_user.role == UserRole.TECHNICIAN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Technicians access assigned installation jobs, not orders",
        )
    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else None
        if order.customer_id != cust_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only view your own order",
            )
    elif current_user.role == UserRole.WAREHOUSE:
        if order.status not in WAREHOUSE_ALLOWED_STAGES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Warehouse can only view orders in packing or dispatch stages. Current stage: {order.status.value}",
            )


@router.get("", response_model=List[OrderOut])
def list_orders(
    status: Optional[OrderStatus] = None,
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.TECHNICIAN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Technicians access assigned installation jobs, not orders",
        )

    query = db.query(Order)
    if current_user.role == UserRole.CUSTOMER:
        cust_id = current_user.customer_profile.id if current_user.customer_profile else -1
        query = query.filter(Order.customer_id == cust_id)
    elif current_user.role == UserRole.WAREHOUSE:
        query = query.filter(Order.status.in_(WAREHOUSE_ALLOWED_STAGES))

    if status:
        query = query.filter(Order.status == status)
    if customer_id and current_user.role == UserRole.ADMIN:
        query = query.filter(Order.customer_id == customer_id)
    return query.order_by(Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    _validate_order_access(order, current_user)
    return order


@router.post("/{order_id}/confirm", response_model=OrderOut)
def confirm_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """
    Confirms an order.
    Automatically:
    (a) generates a warehouse pick list
    (b) creates an installation job on the crew schedule
    (c) sends notifications to warehouse and crew.
    """
    return order_service.confirm_order(db, order_id, current_user.id)


@router.post("/{order_id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(
    order_id: int,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """Records advance or full payment (cash, UPI, bank, cheque)."""
    return order_service.record_payment(db, order_id, payload, current_user.id)

