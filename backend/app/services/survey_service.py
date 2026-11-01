from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.survey import Survey, SurveyStatus
from app.models.lead import Lead, LeadStatus
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.schemas.survey import SurveyCreate, SurveyComplete
from app.core import events


def schedule_survey(db: Session, payload: SurveyCreate, current_user_id: int) -> Survey:
    now_utc = datetime.utcnow()
    sched = payload.scheduled_date.replace(tzinfo=None) if payload.scheduled_date.tzinfo else payload.scheduled_date
    if sched < (now_utc - timedelta(minutes=5)):
        raise HTTPException(status_code=400, detail="Scheduled survey date cannot be in the past")

    lead = db.query(Lead).filter(Lead.id == payload.lead_id, Lead.is_deleted == False).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.status not in (LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED):
        raise HTTPException(status_code=400, detail=f"A survey cannot be scheduled for a lead in status {lead.status.value}")
    if lead.survey:
        raise HTTPException(status_code=400, detail="This lead already has a site survey")
    tech = db.query(User).filter(User.id == payload.technician_id, User.role == UserRole.TECHNICIAN, User.is_active == True).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found or inactive")

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

    events.emit(
        db, "survey.assigned", {"survey_id": survey.id, "lead_id": lead.id},
        user_ids=[tech.id, lead.customer.user_id if lead.customer else None],
        roles=[UserRole.ADMIN],
        title="Site survey assigned to you",
        message=f"Survey for {lead.name} at {lead.address} on {payload.scheduled_date:%d %b %Y %H:%M}.",
        link="/technician",
        category="Surveys",
        notify_user_ids=[tech.id],
    )

    db.commit()
    db.refresh(survey)
    return survey


def complete_survey(db: Session, survey_id: int, payload: SurveyComplete, current_user_id: int) -> Survey:
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    if survey.status != SurveyStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail=f"Only scheduled surveys can be submitted (current: {survey.status.value})")

    for field in ("address_confirmed", "roof_length_ft", "roof_width_ft", "shadow_free_area_sqft", "out_of_shade_zone", "shade_notes"):
        setattr(survey, field, getattr(payload, field))
    survey.submitted_at = datetime.utcnow()
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
    lead = survey.lead
    if payload.feasible:
        # Technician confirmed feasibility on site: the survey is approved and the lead moves on automatically
        db.flush()
        return approve_survey(db, survey.id, current_user_id)
    events.emit(
        db, "survey.submitted", {"survey_id": survey.id, "lead_id": survey.lead_id},
        user_ids=[lead.assigned_to_id, lead.customer.user_id if lead.customer else None],
        roles=[UserRole.ADMIN],
        title="Site survey needs review",
        message=f"Technician did not confirm feasibility for {lead.name}. Review and approve or reject.",
        link=f"/web/crm/{lead.id}",
        category="Surveys",
        notify_user_ids=[lead.assigned_to_id] if lead.assigned_to_id else [],
    )

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
            detail=f"The technician must submit the survey before it can be approved. Current status: {survey.status.value}",
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
    notify_list = [lead.assigned_to_id] if (lead and lead.assigned_to_id) else []
    if lead and lead.customer and lead.customer.user_id:
        notify_list.append(lead.customer.user_id)
    events.emit(
        db, "survey.approved", {"survey_id": survey.id, "lead_id": survey.lead_id},
        user_ids=[survey.technician_id, lead.assigned_to_id if lead else None, lead.customer.user_id if (lead and lead.customer) else None],
        roles=[UserRole.ADMIN],
        title="Site survey approved",
        message="Your site survey has been approved. A quotation will follow.",
        link="/customer",
        category="Surveys",
        notify_user_ids=notify_list,
    )

    db.commit()
    db.refresh(survey)
    return survey


def reject_survey(db: Session, survey_id: int, reason: str, user_id: int) -> Survey:
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    if survey.status not in (SurveyStatus.SCHEDULED, SurveyStatus.COMPLETED):
        raise HTTPException(status_code=400, detail=f"Survey is already {survey.status.value}")
    old_survey_status = survey.status.value
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
        from_status=old_survey_status,
        to_status=SurveyStatus.REJECTED.value,
        notes=f"Survey rejected by manager: {reason}",
        user_id=user_id,
    )
    db.add(audit)
    events.emit(db, "survey.rejected", {"survey_id": survey.id, "lead_id": survey.lead_id},
                user_ids=[survey.technician_id], roles=[UserRole.ADMIN])

    db.commit()
    db.refresh(survey)
    return survey
