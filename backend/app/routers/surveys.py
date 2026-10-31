from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.survey import Survey, SurveyStatus
from app.schemas.survey import SurveyCreate, SurveyComplete, SurveyOut
from app.services import survey_service

router = APIRouter(prefix="/surveys", tags=["Surveys"])


@router.post("", response_model=SurveyOut, status_code=status.HTTP_201_CREATED)
def schedule_survey(
    payload: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SALES, UserRole.ADMIN)),
):
    """Schedule a technician visit for a site survey."""
    return survey_service.schedule_survey(db, payload, current_user.id)


@router.get("", response_model=List[SurveyOut])
def list_surveys(
    technician_id: Optional[int] = None,
    status: Optional[SurveyStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Survey)
    if technician_id:
        query = query.filter(Survey.technician_id == technician_id)
    elif current_user.role == UserRole.TECHNICIAN:
        query = query.filter(Survey.technician_id == current_user.id)
    if status:
        query = query.filter(Survey.status == status)
    return query.order_by(Survey.scheduled_date.asc()).all()


@router.get("/{survey_id}", response_model=SurveyOut)
def get_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey


@router.put("/{survey_id}/complete", response_model=SurveyOut)
def complete_survey(
    survey_id: int,
    payload: SurveyComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN, UserRole.ADMIN)),
):
    """Technician records roof direction, tilt angle, cable distance, and notes."""
    return survey_service.complete_survey(db, survey_id, payload, current_user.id)


@router.post("/{survey_id}/approve", response_model=SurveyOut)
def approve_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES)),
):
    """Manager/Admin approves the survey (required gate for quote generation)."""
    return survey_service.approve_survey(db, survey_id, current_user.id)

