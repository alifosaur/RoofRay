import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.quote import Quote, QuoteStatus
from app.schemas.quote import QuoteCreate, QuoteOut
from app.services import quote_service

router = APIRouter(prefix="/quotes", tags=["Quotations"])


@router.post("", response_model=QuoteOut, status_code=status.HTTP_201_CREATED)
def create_quote(
    payload: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """
    Creates quotation by exploding BOM template.
    GATE: Blocks creation (HTTP 400) if linked site survey is not APPROVED.
    """
    return quote_service.create_quote_from_bom(db, payload, current_user.id)


@router.get("", response_model=List[QuoteOut])
def list_quotes(
    lead_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    status: Optional[QuoteStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Quote)
    if lead_id:
        query = query.filter(Quote.lead_id == lead_id)
    if customer_id:
        query = query.filter(Quote.customer_id == customer_id)
    if status:
        query = query.filter(Quote.status == status)
    return query.order_by(Quote.created_at.desc()).all()


@router.get("/{quote_id}", response_model=QuoteOut)
def get_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote


@router.get("/{quote_id}/pdf")
def download_quote_pdf(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns generated PDF for download."""
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote or not quote.pdf_path or not os.path.exists(quote.pdf_path):
        raise HTTPException(status_code=404, detail="Quotation PDF not found")
    return FileResponse(
        quote.pdf_path,
        media_type="application/pdf",
        filename=f"Quote_{quote.quote_number}.pdf",
    )


@router.post("/{quote_id}/accept")
def accept_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """Accepts quote, marks lead WON, and creates Sales Order in DRAFT."""
    order = quote_service.accept_quote(db, quote_id, current_user.id)
    return {
        "message": "Quote accepted successfully",
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status.value,
    }
