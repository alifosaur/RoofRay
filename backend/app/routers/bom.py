from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.bom import BOMTemplate, BOMLine
from app.schemas.bom import BOMTemplateCreate, BOMTemplateOut

router = APIRouter(prefix="/bom-templates", tags=["BOM Templates"])


@router.get("", response_model=List[BOMTemplateOut])
def list_bom_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(BOMTemplate).order_by(BOMTemplate.capacity_kw.asc()).all()


@router.post("", response_model=BOMTemplateOut, status_code=status.HTTP_201_CREATED)
def create_bom_template(
    payload: BOMTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
):
    existing = db.query(BOMTemplate).filter(BOMTemplate.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="BOM Template with this name already exists")

    template = BOMTemplate(
        name=payload.name,
        capacity_kw=payload.capacity_kw,
        system_type=payload.system_type,
        description=payload.description,
    )
    db.add(template)
    db.flush()

    for line_in in payload.lines:
        line = BOMLine(
            template_id=template.id,
            product_id=line_in.product_id,
            quantity=line_in.quantity,
        )
        db.add(line)

    db.commit()
    db.refresh(template)
    return template


@router.get("/{template_id}", response_model=BOMTemplateOut)
def get_bom_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(BOMTemplate).filter(BOMTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="BOM Template not found")
    return template

