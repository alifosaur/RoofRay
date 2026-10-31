import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class JobStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class InstallationJob(Base):
    __tablename__ = "installation_jobs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_date = Column(DateTime, nullable=False)

    status = Column(Enum(JobStatus), default=JobStatus.SCHEDULED, nullable=False)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    confirmed_capacity_kw = Column(Float, nullable=True)
    power_generating = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="installation_job")
    technician = relationship("User", foreign_keys=[technician_id])
    photos = relationship("JobPhoto", back_populates="job", cascade="all, delete-orphan")
    signature = relationship("JobSignature", back_populates="job", uselist=False, cascade="all, delete-orphan")
    timesheet = relationship("Timesheet", back_populates="job", uselist=False, cascade="all, delete-orphan")

    @property
    def job_number(self) -> str:
        return f"JOB-{str(self.id).zfill(4)}"

    @property
    def customer_name(self):
        return self.order.customer.name if (self.order and self.order.customer) else None

    @property
    def site_address(self):
        c = self.order.customer if self.order else None
        addr = ", ".join(p for p in (c.address, c.city, c.pincode) if p) if c and c.address else None
        if not addr and self.order and self.order.quote and self.order.quote.lead:
            l = self.order.quote.lead
            parts = [p for p in (l.address, l.city, l.state, l.pincode) if p]
            addr = ", ".join(parts) if parts else l.address
        return addr or "Site address not provided"

    @property
    def customer_phone(self) -> str:
        return self.order.customer.phone if (self.order and self.order.customer) else ""

    @property
    def capacity_kw(self):
        if self.confirmed_capacity_kw:
            return self.confirmed_capacity_kw
        if self.order and self.order.quote and self.order.quote.template:
            return self.order.quote.template.capacity_kw
        return None

    @property
    def bom(self):
        lines = self.order.quote.lines if (self.order and self.order.quote) else []
        return [{"product_name": l.product.name, "sku": l.product.sku, "quantity": l.quantity,
                 "is_serialised": l.product.is_serialised} for l in lines]

    @property
    def delivered_serials(self):
        items = self.order.serial_items if self.order else []
        return [{"serial_no": s.serial_no, "product_name": s.product.name, "status": s.status.value,
                 "warranty_start": s.delivered_on, "warranty_end": s.warranty_end} for s in items]

    @property
    def is_released(self) -> bool:
        """Install jobs appear for the technician only once the warehouse has delivered the materials."""
        return bool(self.order and self.order.status.value in ("DELIVERED", "INSTALLED", "CLOSED"))

    @property
    def order_number(self) -> str:
        return self.order.order_number if self.order else ""


class JobPhoto(Base):
    __tablename__ = "job_photos"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("installation_jobs.id"), nullable=False)
    photo_url = Column(String(512), nullable=False)
    caption = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("InstallationJob", back_populates="photos")


class JobSignature(Base):
    __tablename__ = "job_signatures"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("installation_jobs.id"), unique=True, nullable=False)
    signature_data = Column(Text, nullable=False)  # base64 canvas data or image URL
    customer_name = Column(String(255), nullable=False)
    signed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("InstallationJob", back_populates="signature")


class Timesheet(Base):
    __tablename__ = "timesheets"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("installation_jobs.id"), unique=True, nullable=False)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    finish_time = Column(DateTime, nullable=False)
    hours = Column(Float, nullable=False)
    hourly_rate = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)  # hours * hourly_rate
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("InstallationJob", back_populates="timesheet")
    technician = relationship("User")

