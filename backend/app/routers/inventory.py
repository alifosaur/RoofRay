from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.inventory import StockMovement, PickList
from app.models.product import Product
from app.schemas.inventory import StockMovementCreate, StockMovementOut, PickListOut
from app.schemas.product import ProductOut
from app.services import inventory_service

router = APIRouter(prefix="/inventory", tags=["Inventory & Warehouse"])


@router.get("/stock", response_model=List[ProductOut])
def get_stock_levels(
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN, UserRole.SALES)),
):
    """Returns current inventory stock levels, optionally filtered by low stock."""
    query = db.query(Product)
    if low_stock_only:
        query = query.filter(Product.stock_quantity <= Product.min_stock_alert)
    return query.order_by(Product.stock_quantity.asc()).all()


@router.post("/purchases", response_model=StockMovementOut, status_code=status.HTTP_201_CREATED)
def record_purchase(
    payload: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """Records inward stock purchase movement."""
    return inventory_service.record_purchase_movement(db, payload, current_user.id)


@router.get("/pick-lists", response_model=List[PickListOut])
def list_pick_lists(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN, UserRole.SALES)),
):
    """Lists warehouse pick lists."""
    query = db.query(PickList)
    if status:
        query = query.filter(PickList.status == status)
    return query.order_by(PickList.created_at.desc()).all()


@router.get("/pick-lists/{pick_list_id}", response_model=PickListOut)
def get_pick_list(
    pick_list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN, UserRole.SALES)),
):
    pick_list = db.query(PickList).filter(PickList.id == pick_list_id).first()
    if not pick_list:
        raise HTTPException(status_code=404, detail="Pick list not found")
    return pick_list


@router.put("/pick-lists/{pick_list_id}/pack", response_model=PickListOut)
def pack_pick_list(
    pick_list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """Warehouse confirms picking & packing for an order."""
    return inventory_service.pack_pick_list(db, pick_list_id, current_user.id)

