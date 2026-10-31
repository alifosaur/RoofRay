from datetime import datetime, date
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.finance import Invoice, InvoiceType, InvoiceStatus, InvoiceLine, SubsidyRecord, SubsidyStatus, SubsidyEvent, SUBSIDY_STEPS, TechnicianPayout
from app.models.user import UserRole
from app.core import events
from app.services import audit_service
from app.models.order import Order
from app.models.job import InstallationJob, JobStatus, Timesheet
from app.models.audit import AuditLog
from app.schemas.finance import SubsidyRecordUpdate


def get_or_create_subsidy_record(db: Session, order_id: int) -> SubsidyRecord:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    subsidy = db.query(SubsidyRecord).filter(SubsidyRecord.order_id == order.id).first()
    if not subsidy:
        grid_tied = bool(order.quote and order.quote.template and order.quote.template.system_type == "On-Grid")
        subsidy = SubsidyRecord(
            order_id=order.id,
            status=SubsidyStatus.NOT_APPLIED,
            eligible_amount=(order.quote.subsidy_amount if grid_tied else 0.0),
            disbursed_amount=0.0,
            remarks=None if grid_tied else "Not eligible: subsidy applies to grid-connected systems only.",
        )
        db.add(subsidy)
        db.flush()  # part of the caller's transaction (order confirmation)
    return subsidy


def update_subsidy_record(db: Session, subsidy_id: int, payload: SubsidyRecordUpdate, current_user_id: int) -> SubsidyRecord:
    """Edits amounts / application number (audited old → new). Status moves only via add_subsidy_step."""
    subsidy = db.query(SubsidyRecord).filter(SubsidyRecord.id == subsidy_id).first()
    if not subsidy:
        raise HTTPException(status_code=404, detail="Subsidy record not found")
    data = payload.model_dump(exclude_unset=True)
    if "application_ref" in data:
        data.setdefault("application_no", data.pop("application_ref"))
    if "approved_amount" in data:
        data.setdefault("sanctioned_amount", data.pop("approved_amount"))
    if "status" in data:
        if data["status"] != subsidy.status:
            add_subsidy_step(db, subsidy, data["status"], date.today(), data.get("application_no"), data.get("remarks"), None, current_user_id)
        data.pop("status")
    audit_service.apply_changes(db, "subsidy", subsidy, {k: v for k, v in data.items() if hasattr(subsidy, k)}, current_user_id)
    db.commit()
    db.refresh(subsidy)
    return subsidy


def add_subsidy_step(db: Session, subsidy: SubsidyRecord, new_status: SubsidyStatus, event_date, reference_no, notes,
                     document_url, current_user_id: int) -> SubsidyEvent:
    """Advances the tracker by exactly one step (or to REJECTED), recording date, reference and document."""
    if subsidy.status in (SubsidyStatus.DISBURSED, SubsidyStatus.REJECTED):
        raise HTTPException(status_code=400, detail=f"Subsidy tracker is closed ({subsidy.status.value})")
    if subsidy.remarks and subsidy.remarks.startswith("Not eligible") and new_status != SubsidyStatus.REJECTED:
        raise HTTPException(status_code=400, detail="This order is not eligible for the subsidy (Off-Grid)")
    if new_status != SubsidyStatus.REJECTED:
        expected = SUBSIDY_STEPS[SUBSIDY_STEPS.index(subsidy.status) + 1]
        if new_status != expected:
            raise HTTPException(status_code=400, detail=f"Next subsidy step is {expected.value}, not {new_status.value}")
    old = subsidy.status
    subsidy.status = new_status
    if new_status == SubsidyStatus.REGISTERED:
        subsidy.applied_date = event_date
        if reference_no:
            subsidy.application_no = reference_no
    elif new_status == SubsidyStatus.APPROVED:
        subsidy.approved_date = event_date
    elif new_status == SubsidyStatus.DISBURSED:
        subsidy.disbursed_date = event_date
    elif new_status == SubsidyStatus.REJECTED:
        subsidy.rejection_notes = notes
    ev = SubsidyEvent(subsidy_id=subsidy.id, status=new_status, event_date=event_date, reference_no=reference_no,
                      document_url=document_url, notes=notes, created_by_id=current_user_id)
    db.add(ev)
    db.add(AuditLog(record_type="subsidy", record_id=subsidy.id, action="SUBSIDY_STEP", from_status=old.value,
                    to_status=new_status.value, notes=f"Ref: {reference_no or '-'}. {notes or ''}".strip(), user_id=current_user_id))
    order = subsidy.order
    events.emit(
        db, "subsidy.updated", {"subsidy_id": subsidy.id, "order_id": subsidy.order_id, "status": new_status.value},
        user_ids=[order.customer.user_id if order and order.customer else None], roles=[UserRole.ADMIN],
        title="Subsidy status updated",
        message=f"Your subsidy application is now: {new_status.value.replace('_', ' ').title()}.",
        link="/customer",
    )
    db.flush()
    return ev


def create_or_sync_technician_payout(db: Session, job_id: int) -> TechnicianPayout:
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    timesheet = job.timesheet or db.query(Timesheet).filter(Timesheet.job_id == job.id).first()
    if not timesheet:
        raise HTTPException(status_code=400, detail="Completed job with timesheet required")

    payout = db.query(TechnicianPayout).filter(TechnicianPayout.job_id == job.id).first()
    if not payout:
        payout = TechnicianPayout(
            technician_id=job.technician_id,
            job_id=job.id,
            hours=timesheet.hours,
            hourly_rate=timesheet.hourly_rate,
            total_amount=timesheet.total_cost,
            is_paid=False,
        )
        db.add(payout)
        db.flush()  # committed with the job completion
    return payout


def mark_payout_paid(db: Session, payout_id: int, current_user_id: int) -> TechnicianPayout:
    payout = db.query(TechnicianPayout).filter(TechnicianPayout.id == payout_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout record not found")

    payout.is_paid = True
    payout.paid_at = datetime.utcnow()

    audit = AuditLog(
        record_type="payout",
        record_id=payout.id,
        action="PAYOUT_DISBURSED",
        from_status="UNPAID",
        to_status="PAID",
        notes=f"Technician payout of ₹{payout.total_amount:,.2f} disbursed for {payout.hours} hours.",
        user_id=current_user_id,
    )
    db.add(audit)

    db.commit()
    db.refresh(payout)
    return payout

