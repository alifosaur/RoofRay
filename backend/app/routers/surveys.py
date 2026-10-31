from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core import access
from app.core.uploads import save_upload
from app.models.lead import Lead
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.survey import Survey, SurveyStatus, SurveyPhoto
from app.schemas.survey import SurveyCreate, SurveyComplete, SurveyOut, SurveyPhotoOut
from app.services import survey_service

router = APIRouter(prefix="/surveys", tags=["Surveys"])


@router.post("", response_model=SurveyOut, status_code=status.HTTP_201_CREATED)
def schedule_survey(
    payload: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """Schedule a technician visit for a site survey."""
    lead = db.query(Lead).filter(Lead.id == payload.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    access.ensure_lead_access(lead, current_user)
    return survey_service.schedule_survey(db, payload, current_user.id)


@router.get("", response_model=List[SurveyOut])
def list_surveys(
    technician_id: Optional[int] = None,
    status: Optional[SurveyStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (UserRole.CUSTOMER, UserRole.WAREHOUSE):
        raise HTTPException(status_code=403, detail="Forbidden: site surveys are for sales and technicians")

    query = db.query(Survey)
    if current_user.role == UserRole.TECHNICIAN:
        query = query.filter(Survey.technician_id == current_user.id)
    elif current_user.role == UserRole.SALES:
        query = query.join(Lead, Survey.lead_id == Lead.id).filter(Lead.assigned_to_id == current_user.id)
    if technician_id and current_user.role in [UserRole.ADMIN, UserRole.SALES]:
        query = query.filter(Survey.technician_id == technician_id)

    if status:
        query = query.filter(Survey.status == status)
    return query.order_by(Survey.scheduled_date.asc()).all()


@router.get("/{survey_id}", response_model=SurveyOut)
def get_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (UserRole.CUSTOMER, UserRole.WAREHOUSE):
        raise HTTPException(status_code=403, detail="Forbidden: site surveys are for sales and technicians")

    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    if current_user.role == UserRole.SALES:
        access.ensure_lead_access(survey.lead, current_user)

    if current_user.role == UserRole.TECHNICIAN and survey.technician_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You can only view surveys assigned to you",
        )
    return survey


@router.put("/{survey_id}/complete", response_model=SurveyOut)
@router.post("/{survey_id}/complete", response_model=SurveyOut)
def complete_survey(
    survey_id: int,
    payload: SurveyComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN, UserRole.ADMIN)),
):
    """Technician records roof direction, tilt angle, cable distance, and notes."""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if current_user.role == UserRole.TECHNICIAN and survey.technician_id and survey.technician_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You can only complete surveys assigned to you",
        )

    return survey_service.complete_survey(db, survey_id, payload, current_user.id)


@router.post("/{survey_id}/approve", response_model=SurveyOut)
def approve_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
):
    """Sales reviews and approves the submitted survey (required gate for quote generation)."""
    _ensure_sales_owns_survey(db, survey_id, current_user)
    return survey_service.approve_survey(db, survey_id, current_user.id)


@router.post("/{survey_id}/reject", response_model=SurveyOut)
def reject_survey(
    survey_id: int,
    reason: str = "Rooftop structurally unsuitable or excessive shading",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
):
    """Sales/Admin rejects the survey (marks linked lead as LOST)."""
    _ensure_sales_owns_survey(db, survey_id, current_user)
    return survey_service.reject_survey(db, survey_id, reason, current_user.id)


def _ensure_sales_owns_survey(db: Session, survey_id: int, current_user: User) -> None:
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    access.ensure_lead_access(survey.lead, current_user)




@router.post("/{survey_id}/photos", response_model=SurveyPhotoOut, status_code=status.HTTP_201_CREATED)
def upload_survey_photo(
    survey_id: int,
    file: UploadFile = File(...),
    caption: str = Form("Site survey photo"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN, UserRole.ADMIN)),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    if current_user.role == UserRole.TECHNICIAN and survey.technician_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only add photos to surveys assigned to you")
    photo = SurveyPhoto(survey_id=survey.id, photo_url=save_upload(file, "photos", f"survey_{survey.id}"), caption=caption)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo
