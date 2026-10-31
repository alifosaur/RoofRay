import os
import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job import InstallationJob, JobStatus, JobPhoto, JobSignature, Timesheet
from app.models.order import Order, OrderStatus
from app.models.serial import SerialItem, SerialStatus
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.job import JobCompleteRequest


def start_job(db: Session, job_id: int, current_user: User) -> InstallationJob:
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

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

    db.commit()
    db.refresh(job)
    return job


def add_job_photo(db: Session, job_id: int, file: UploadFile, caption: str, current_user_id: int) -> JobPhoto:
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    photos_dir = os.path.join(settings.UPLOAD_DIR, "photos")
    os.makedirs(photos_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"job_{job.id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(photos_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    photo_url = f"/uploads/photos/{unique_filename}"
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

    if job.status == JobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Job is already completed")

    # If job wasn't explicitly started, assume started 4 hours ago for timesheet calculation
    if not job.started_at:
        job.started_at = datetime.utcnow() - timedelta(hours=4)

    finish_time = payload.finish_time or datetime.utcnow()
    if finish_time < job.started_at:
        finish_time = job.started_at + timedelta(hours=1)
    job.finished_at = finish_time

    # 1. Automatic Timesheet derivation
    elapsed_seconds = max(3600, (finish_time - job.started_at).total_seconds())
    hours = round(elapsed_seconds / 3600.0, 2)
    technician = db.query(User).filter(User.id == job.technician_id).first()
    hourly_rate = float(technician.hourly_rate) if technician else 500.0
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

    db.commit()
    db.refresh(job)
    return job
