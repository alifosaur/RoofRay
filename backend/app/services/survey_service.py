from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.survey import Survey, SurveyStatus
from app.models.lead import Lead, LeadStatus
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.schemas.survey import SurveyCreate, SurveyComplete


def schedule_survey(db: Session, payload: SurveyCreate, current_user_id: int) -> Survey:
    lead = db.query(Lead).filter(Lead.id == payload.lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    existing_survey = db.query(Survey).filter(Survey.lead_id == lead.id).first()
    if existing_survey:
        raise HTTPException(status_code=400, detail="A survey has already been scheduled for this lead")

    survey = Survey(
        lead_id=payload.lead_id,
        technician_id=payload.technician_id,
        scheduled_date=payload.scheduled_date,
        notes=payload.notes,
        status=SurveyStatus.SCHEDULED,
    )
    db.add(survey)

    old_lead_status = lead.status.value
    lead.status = LeadStatus.SURVEY_SCHEDULED

    # Audit log
    audit = AuditLog(
        record_type="survey",
        record_id=lead.id,
        action="SURVEY_SCHEDULED",
        from_status=old_lead_status,
        to_status=SurveyStatus.SCHEDULED.value,
        notes=f"Site survey scheduled for {payload.scheduled_date}.",
        user_id=current_user_id,
    )
    db.add(audit)

    # Notify technician
    notif = Notification(
        user_id=payload.technician_id,
        title="Site Survey Assigned",
        message=f"You have a site survey scheduled at {lead.address} on {payload.scheduled_date.strftime('%Y-%m-%d %H:%M')}.",
        link=f"/surveys/{survey.id}",
    )
    db.add(notif)

    db.commit()
    db.refresh(survey)
    return survey


def complete_survey(db: Session, survey_id: int, payload: SurveyComplete, current_user_id: int) -> Survey:
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    survey.roof_direction = payload.roof_direction
    survey.roof_tilt_deg = payload.roof_tilt_deg
    survey.cable_distance_meters = payload.cable_distance_meters
    survey.notes = payload.notes
    survey.status = SurveyStatus.COMPLETED

    audit = AuditLog(
        record_type="survey",
        record_id=survey.id,
        action="SURVEY_COMPLETED",
        from_status=SurveyStatus.SCHEDULED.value,
        to_status=SurveyStatus.COMPLETED.value,
        notes=f"Survey completed: Direction={payload.roof_direction}, Tilt={payload.roof_tilt_deg} deg, Cable={payload.cable_distance_meters} m.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(survey)
    return survey


def approve_survey(db: Session, survey_id: int, approved_by_id: int) -> Survey:
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status != SurveyStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only completed surveys can be approved. Current status: {survey.status.value}",
        )

    survey.status = SurveyStatus.APPROVED
    survey.approved_by_id = approved_by_id
    survey.approved_at = datetime.utcnow()

    # Update linked lead to SURVEY_APPROVED
    lead = db.query(Lead).filter(Lead.id == survey.lead_id).first()
    if lead:
        old_lead_status = lead.status.value
        lead.status = LeadStatus.SURVEY_APPROVED
        audit_lead = AuditLog(
            record_type="lead",
            record_id=lead.id,
            action="SURVEY_APPROVED",
            from_status=old_lead_status,
            to_status=LeadStatus.SURVEY_APPROVED.value,
            notes=f"Site survey approved. Lead ready for quote generation.",
            user_id=approved_by_id,
        )
        db.add(audit_lead)

    audit = AuditLog(
        record_type="survey",
        record_id=survey.id,
        action="SURVEY_APPROVED",
        from_status=SurveyStatus.COMPLETED.value,
        to_status=SurveyStatus.APPROVED.value,
        notes="Survey approved by manager.",
        user_id=approved_by_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(survey)
    return survey

