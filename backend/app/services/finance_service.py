from datetime import datetime, date
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.finance import Invoice, InvoiceType, InvoiceStatus, InvoiceLine, SubsidyRecord, SubsidyStatus, TechnicianPayout
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
        # Eligible amount from quote subsidy_amount
        eligible = order.quote.subsidy_amount if order.quote else 0.0
        subsidy = SubsidyRecord(
            order_id=order.id,
            status=SubsidyStatus.NOT_APPLIED,
            eligible_amount=eligible,
            disbursed_amount=0.0,
        )
        db.add(subsidy)
        db.commit()
        db.refresh(subsidy)
    return subsidy


def update_subsidy_record(db: Session, subsidy_id: int, payload: SubsidyRecordUpdate, current_user_id: int) -> SubsidyRecord:
    subsidy = db.query(SubsidyRecord).filter(SubsidyRecord.id == subsidy_id).first()
    if not subsidy:
        raise HTTPException(status_code=404, detail="Subsidy record not found")

    old_status = subsidy.status.value
    data = payload.model_dump(exclude_unset=True)

    if "application_ref" in data and not data.get("application_no"):
        data["application_no"] = data.pop("application_ref")
    elif "application_ref" in data:
        data.pop("application_ref")

    if "approved_amount" in data and not data.get("sanctioned_amount"):
        data["sanctioned_amount"] = data.pop("approved_amount")
    elif "approved_amount" in data:
        data.pop("approved_amount")

    for k, v in data.items():
        if hasattr(subsidy, k):
            setattr(subsidy, k, v)

    if payload.status and payload.status.value != old_status:
        audit = AuditLog(
            record_type="subsidy",
            record_id=subsidy.id,
            action="SUBSIDY_STATUS_UPDATED",
            from_status=old_status,
            to_status=payload.status.value,
            notes=f"Subsidy status changed to {payload.status.value}. App No: {subsidy.application_no or 'N/A'}.",
            user_id=current_user_id,
        )
        db.add(audit)

    db.commit()
    db.refresh(subsidy)
    return subsidy


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
        db.commit()
        db.refresh(payout)
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

