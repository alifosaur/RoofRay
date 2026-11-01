import os
import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.uploads import save_upload
from app.models.job import InstallationJob, JobStatus, JobPhoto, JobSignature, Timesheet
from app.models.order import Order, OrderStatus
from app.models.serial import SerialItem, SerialStatus
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.job import JobCompleteRequest
from app.services import order_service
from app.core import events
from app.models.user import UserRole
from app.models.finance import SubsidyStatus
from app.models.lead import LeadStatus


def _require_delivered(job: InstallationJob) -> None:
    if job.order and job.order.status not in (OrderStatus.DELIVERED, OrderStatus.INSTALLED, OrderStatus.CLOSED):
        raise HTTPException(
            status_code=400,
            detail=f"Materials for {job.order.order_number} have not been delivered yet (order status: {job.order.status.value}).",
        )


def start_job(db: Session, job_id: int, current_user: User) -> InstallationJob:
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail=f"Only scheduled jobs can be started (current: {job.status.value})")
    _require_delivered(job)

    job.started_at = datetime.utcnow()
    job.status = JobStatus.IN_PROGRESS

    audit = AuditLog(
        record_type="job",
        record_id=job.id,
        action="JOB_STARTED",
        from_status=JobStatus.SCHEDULED.value,
        to_status=JobStatus.IN_PROGRESS.value,
        notes=f"Installation started by technician {current_user.full_name} at {job.started_at.strftime('%Y-%m-%d %H:%M')}.",
        user_id=current_user.id,
    )
    db.add(audit)
    events.emit(db, "job.started", {"job_id": job.id, "order_id": job.order_id},
                user_ids=[job.order.customer.user_id], roles=[UserRole.ADMIN, UserRole.SALES])

    db.commit()
    db.refresh(job)
    return job


def add_job_photo(db: Session, job_id: int, file: UploadFile, caption: str, current_user_id: int) -> JobPhoto:
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    photo_url = save_upload(file, "photos", f"job_{job.id}")
    job_photo = JobPhoto(
        job_id=job.id,
        photo_url=photo_url,
        caption=caption,
    )
    db.add(job_photo)
    db.commit()
    db.refresh(job_photo)
    return job_photo


def complete_job(db: Session, job_id: int, payload: JobCompleteRequest, current_user: User) -> InstallationJob:
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail=f"Start the job before completing it (current: {job.status.value})")
    _require_delivered(job)
    if not job.photos:
        raise HTTPException(status_code=400, detail="Upload at least one installation photo before completing the job")
    if not payload.signature_data:
        raise HTTPException(status_code=400, detail="The customer's signature is required")

    if payload.start_time:
        job.started_at = payload.start_time
    finish_time = payload.finish_time or datetime.utcnow()

    # Handle overnight shift or clock rollover if finish_time is before started_at
    if finish_time < job.started_at:
        diff_seconds = (job.started_at - finish_time).total_seconds()
        # If finish_time was explicitly provided and crossed midnight (e.g. start 23:00, finish 01:45)
        if payload.finish_time and diff_seconds < 86400:
            finish_time = finish_time + timedelta(days=1)
        # If only start_time was provided (e.g. technician entered 01:45 AM before clock time 00:05 AM)
        elif not payload.finish_time and diff_seconds < 86400:
            job.started_at = job.started_at - timedelta(days=1)

    if finish_time < job.started_at:
        # Fallback safeguard: align finish_time to at least started_at so job completion never breaks
        finish_time = job.started_at

    job.finished_at = finish_time

    # 1. Timesheet from the real start/finish times
    hours = max(0.1, round((finish_time - job.started_at).total_seconds() / 3600.0, 2))
    technician = db.query(User).filter(User.id == job.technician_id).first()
    hourly_rate = float(technician.hourly_rate) if technician else 0.0
    total_cost = round(hours * hourly_rate, 2)

    timesheet = db.query(Timesheet).filter(Timesheet.job_id == job.id).first()
    if not timesheet:
        timesheet = Timesheet(
            job_id=job.id,
            technician_id=job.technician_id,
            start_time=job.started_at,
            finish_time=job.finished_at,
            hours=hours,
            hourly_rate=hourly_rate,
            total_cost=total_cost,
        )
        db.add(timesheet)
    else:
        timesheet.start_time = job.started_at
        timesheet.finish_time = job.finished_at
        timesheet.hours = hours
        timesheet.hourly_rate = hourly_rate
        timesheet.total_cost = total_cost

    db.flush()

    # 2. Customer on-screen signature
    sig = db.query(JobSignature).filter(JobSignature.job_id == job.id).first()
    if not sig:
        sig = JobSignature(
            job_id=job.id,
            signature_data=payload.signature_data,
            customer_name=payload.customer_name,
            signed_at=datetime.utcnow(),
        )
        db.add(sig)
    else:
        sig.signature_data = payload.signature_data
        sig.customer_name = payload.customer_name
        sig.signed_at = datetime.utcnow()

    # 3. Job details & Status
    job.confirmed_capacity_kw = payload.confirmed_capacity_kw
    job.power_generating = payload.power_generating
    job.notes = payload.notes
    job.status = JobStatus.COMPLETED

    # 4. Transition Order to INSTALLED
    order = job.order
    if order:
        order.status = OrderStatus.INSTALLED
        order.installed_at = datetime.utcnow()

        # Update Serial items to INSTALLED
        for s in order.serial_items:
            s.status = SerialStatus.INSTALLED

        audit_order = AuditLog(
            record_type="order",
            record_id=order.id,
            action="ORDER_INSTALLED",
            from_status=OrderStatus.DELIVERED.value,
            to_status=OrderStatus.INSTALLED.value,
            notes=f"Installation verified and operational. Power generation: {payload.power_generating}. Capacity: {payload.confirmed_capacity_kw} kW.",
            user_id=current_user.id,
        )
        db.add(audit_order)
        order_service.settle_if_fully_paid(db, order, current_user.id)

    audit_job = AuditLog(
        record_type="job",
        record_id=job.id,
        action="JOB_COMPLETED",
        from_status=JobStatus.IN_PROGRESS.value,
        to_status=JobStatus.COMPLETED.value,
        notes=f"Installation job completed by {current_user.full_name}. Timesheet: {hours} hrs @ ₹{hourly_rate}/hr = ₹{total_cost:,.2f}.",
        user_id=current_user.id,
    )
    db.add(audit_job)

    # 5. Automatically create/sync technician payout record for accounts/admin
    from app.services import finance_service
    finance_service.create_or_sync_technician_payout(db, job.id)
    if order and order.subsidy_record and order.subsidy_record.status == SubsidyStatus.FEASIBILITY_APPROVED:
        finance_service.add_subsidy_step(db, order.subsidy_record, SubsidyStatus.INSTALLATION_DONE, datetime.utcnow().date(),
                                         None, "Installation completed and signed off on site.", None, current_user.id)
    lead = order.quote.lead if order and order.quote else None
    if lead and lead.status != LeadStatus.WON:
        db.add(AuditLog(record_type="lead", record_id=lead.id, action="LEAD_WON", from_status=lead.status.value,
                        to_status=LeadStatus.WON.value, notes=f"Installation completed for {order.order_number}.",
                        user_id=current_user.id))
        lead.status = LeadStatus.WON
    remaining_balance = round(max(0.0, order.total_amount - order.paid_amount), 2) if order else 0.0
    if remaining_balance > 0.01:
        events.emit(
            db, "job.completed", {"job_id": job.id, "order_id": job.order_id},
            user_ids=[order.customer.user_id if order else None],
            roles=[UserRole.ADMIN],
            title="Installation Confirmed — Final 50% Payment Due",
            message=f"Technician {current_user.full_name} has verified installation of your {job.confirmed_capacity_kw} kW system! Please pay the remaining 50% balance (₹{remaining_balance:,.2f}) to receive your final full payment tax invoice.",
            link="/customer",
            category="Orders",
            notify_user_ids=[order.customer.user_id] if (order and order.customer) else [],
        )
    else:
        events.emit(
            db, "job.completed", {"job_id": job.id, "order_id": job.order_id},
            user_ids=[order.customer.user_id if order else None, lead.assigned_to_id if lead else None],
            roles=[UserRole.ADMIN],
            title="Installation complete",
            message=f"Your {job.confirmed_capacity_kw} kW system has been installed and tested.",
            link="/customer",
            category="Orders",
            notify_user_ids=[order.customer.user_id] if (order and order.customer) else [],
        )

    db.commit()
    db.refresh(job)
    return job

