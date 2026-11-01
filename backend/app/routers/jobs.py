from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.order import Order, OrderStatus
from app.core.security import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.job import InstallationJob, JobStatus
from app.schemas.job import InstallationJobOut, JobCompleteRequest, JobPhotoOut
from app.services import job_service

router = APIRouter(prefix="/jobs", tags=["Installation Jobs & Field Service"])


class JobUpdate(BaseModel):
    technician_id: Optional[int] = None
    scheduled_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[JobStatus] = None


@router.put("/{job_id}", response_model=InstallationJobOut)
def update_job(
    job_id: int,
    payload: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE)),
):
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(job, k, v)

    db.commit()
    db.refresh(job)
    return job


@router.get("/my-schedule", response_model=List[InstallationJobOut])
def get_my_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN, UserRole.ADMIN, UserRole.SALES)),
):
    """Returns today and upcoming jobs for the logged in technician (or all for managers)."""
    query = db.query(InstallationJob)
    if current_user.role == UserRole.TECHNICIAN:
        # Hidden until the warehouse marks the order DELIVERED
        query = query.filter(InstallationJob.technician_id == current_user.id, InstallationJob.order.has(Order.status.in_([OrderStatus.DELIVERED, OrderStatus.INSTALLED, OrderStatus.CLOSED])))
    return query.order_by(InstallationJob.scheduled_date.asc()).all()


@router.get("", response_model=List[InstallationJobOut])
def list_jobs(
    technician_id: Optional[int] = None,
    status: Optional[JobStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN, UserRole.ADMIN, UserRole.SALES)),
):
    query = db.query(InstallationJob)
    if current_user.role == UserRole.TECHNICIAN:
        query = query.filter(InstallationJob.technician_id == current_user.id, InstallationJob.order.has(Order.status.in_([OrderStatus.DELIVERED, OrderStatus.INSTALLED, OrderStatus.CLOSED])))
    elif technician_id and current_user.role == UserRole.ADMIN:
        query = query.filter(InstallationJob.technician_id == technician_id)

    if status:
        query = query.filter(InstallationJob.status == status)
    return query.order_by(InstallationJob.scheduled_date.asc()).all()


@router.get("/{job_id}", response_model=InstallationJobOut)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN, UserRole.ADMIN, UserRole.SALES)),
):
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user.role == UserRole.TECHNICIAN and (job.technician_id != current_user.id or not job.is_released):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: this job is not assigned to you or not released yet",
        )
    return job


@router.post("/{job_id}/start", response_model=InstallationJobOut)
def start_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN, UserRole.ADMIN)),
):
    """Technician marks arrival on site and starts job."""
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role == UserRole.TECHNICIAN and job.technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot start another technician's job",
        )
    return job_service.start_job(db, job_id, current_user)


@router.post("/{job_id}/photos", response_model=JobPhotoOut, status_code=status.HTTP_201_CREATED)
def upload_job_photo(
    job_id: int,
    file: UploadFile = File(...),
    caption: str = Form("Site Installation Photo"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN, UserRole.ADMIN)),
):
    """Upload site photo (inverter mounting, panel alignment, earthing, etc.)."""
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role == UserRole.TECHNICIAN and job.technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot upload photos to another technician's job",
        )
    return job_service.add_job_photo(db, job_id, file, caption, current_user.id)


@router.post("/{job_id}/complete", response_model=InstallationJobOut)
def complete_job(
    job_id: int,
    payload: JobCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TECHNICIAN, UserRole.ADMIN)),
):
    """
    Submits completed job:
    - verified power generation test
    - customer on-screen signature
    - automatically generates timesheet derived from start and finish timestamps
    - marks job COMPLETED and Order INSTALLED.
    """
    job = db.query(InstallationJob).filter(InstallationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role == UserRole.TECHNICIAN and job.technician_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot complete another technician's job",
        )
    return job_service.complete_job(db, job_id, payload, current_user)

