from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.survey import Survey, SurveyStatus
from app.models.lead import Lead, LeadStatus
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.schemas.survey import SurveyCreate, SurveyComplete


def schedule_survey(db: Session, payload: SurveyCreate, current_user_id: int) -> Survey:
    lead = db.query(Lead).filter(Lead.id == payload.lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    tech = db.query(User).filter(User.id == payload.technician_id, User.role == UserRole.TECHNICIAN).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found or not a technician")

    survey = Survey(
        lead_id=lead.id,
        technician_id=tech.id,
        scheduled_date=payload.scheduled_date,
        notes=payload.notes,
        status=SurveyStatus.SCHEDULED,
    )
    db.add(survey)
    db.flush()

    # Move lead to SURVEY_SCHEDULED
    old_lead_status = lead.status.value
    lead.status = LeadStatus.SURVEY_SCHEDULED

    audit_lead = AuditLog(
        record_type="lead",
        record_id=lead.id,
        action="SURVEY_SCHEDULED",
        from_status=old_lead_status,
        to_status=LeadStatus.SURVEY_SCHEDULED.value,
        notes=f"Survey scheduled with {tech.full_name} for {payload.scheduled_date}.",
        user_id=current_user_id,
    )
    db.add(audit_lead)

    notif = Notification(
        user_id=tech.id,
        title="Site Survey Assigned",
        message=f"You have been assigned to survey {lead.name} at {lead.address}.",
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

    if survey.status not in [SurveyStatus.COMPLETED, SurveyStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only scheduled or completed surveys can be approved. Current status: {survey.status.value}",
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
            notes="Site survey approved. Lead ready for quote generation.",
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


def reject_survey(db: Session, survey_id: int, reason: str, user_id: int) -> Survey:
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    survey.status = SurveyStatus.REJECTED
    lead = db.query(Lead).filter(Lead.id == survey.lead_id).first()
    if lead:
        old_status = lead.status.value
        lead.status = LeadStatus.LOST
        lead.lost_reason = f"Survey rejected: {reason}"
        audit_lead = AuditLog(
            record_type="lead",
            record_id=lead.id,
            action="SURVEY_REJECTED",
            from_status=old_status,
            to_status=LeadStatus.LOST.value,
            notes=f"Site survey rejected ({reason}). Lead marked LOST.",
            user_id=user_id,
        )
        db.add(audit_lead)

    audit = AuditLog(
        record_type="survey",
        record_id=survey.id,
        action="SURVEY_REJECTED",
        from_status=survey.status.value,
        to_status=SurveyStatus.REJECTED.value,
        notes=f"Survey rejected by manager: {reason}",
        user_id=user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(survey)
    return survey
