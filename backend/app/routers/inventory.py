from typing import List, Optional
from pydantic import BaseModel
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


class ScanCodePayload(BaseModel):
    code: str


@router.put("/pick-lists/{pick_list_id}/lines/{line_id}/pick", response_model=PickListOut)
def pick_line_item(
    pick_list_id: int,
    line_id: int,
    qty: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """Update picked quantity or toggle check for a single item in the installation pick list."""
    pick_list = db.query(PickList).filter(PickList.id == pick_list_id).first()
    if not pick_list:
        raise HTTPException(status_code=404, detail="Pick list not found")

    line = next((l for l in pick_list.lines if l.id == line_id), None)
    if not line:
        raise HTTPException(status_code=404, detail="Item line not found in pick list")

    if qty is not None:
        line.picked_qty = max(0, min(line.required_qty, qty))
    else:
        # Toggle: if already full, reset to 0; otherwise set to required_qty
        if line.picked_qty >= line.required_qty:
            line.picked_qty = 0
        else:
            line.picked_qty = line.required_qty

    db.commit()
    db.refresh(pick_list)
    return pick_list


@router.post("/pick-lists/{pick_list_id}/scan", response_model=PickListOut)
def scan_pick_item(
    pick_list_id: int,
    payload: ScanCodePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """Scan barcode, SKU or serial to verify and tick item on installation pick list."""
    pick_list = db.query(PickList).filter(PickList.id == pick_list_id).first()
    if not pick_list:
        raise HTTPException(status_code=404, detail="Pick list not found")

    code = payload.code.strip().upper()
    matched_line = None
    for line in pick_list.lines:
        if line.product:
            if line.product.sku.upper() == code or code in line.product.sku.upper() or code in line.product.name.upper():
                matched_line = line
                break

    if not matched_line:
        from app.models.serial import SerialItem
        serial_item = db.query(SerialItem).filter(
            (SerialItem.serial_no.ilike(code)) | (SerialItem.serial_no.ilike(f"%{code}%"))
        ).first()
        if serial_item:
            matched_line = next((l for l in pick_list.lines if l.product_id == serial_item.product_id), None)

    if not matched_line:
        raise HTTPException(
            status_code=404,
            detail=f"Scanned barcode/SKU '{payload.code}' does not match any item in this installation's pre-generated checklist.",
        )

    matched_line.picked_qty = min(matched_line.required_qty, matched_line.picked_qty + 1)
    db.commit()
    db.refresh(pick_list)
    return pick_list


@router.put("/pick-lists/{pick_list_id}/pack", response_model=PickListOut)
def pack_pick_list(
    pick_list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.WAREHOUSE, UserRole.ADMIN)),
):
    """Warehouse confirms picking & packing for an order."""
    return inventory_service.pack_pick_list(db, pick_list_id, current_user.id)

