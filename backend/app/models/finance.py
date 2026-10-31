import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class InvoiceType(str, enum.Enum):
    SALES = "SALES"
    REPAIR = "REPAIR"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class SubsidyStatus(str, enum.Enum):
    NOT_APPLIED = "NOT_APPLIED"
    APPLIED = "APPLIED"
    APPROVED = "APPROVED"
    DISBURSED = "DISBURSED"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(64), unique=True, index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    invoice_type = Column(Enum(InvoiceType), default=InvoiceType.SALES, nullable=False)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)

    subtotal = Column(Float, nullable=False, default=0.0)
    tax_amount = Column(Float, nullable=False, default=0.0)
    total_amount = Column(Float, nullable=False, default=0.0)
    due_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="invoice")
    ticket = relationship("Ticket", back_populates="repair_invoice")
    customer = relationship("Customer")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)

    invoice = relationship("Invoice", back_populates="lines")


class SubsidyRecord(Base):
    __tablename__ = "subsidy_records"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    application_no = Column(String(128), nullable=True)
    portal_name = Column(String(128), default="National Solar Portal", nullable=False)

    status = Column(Enum(SubsidyStatus), default=SubsidyStatus.NOT_APPLIED, nullable=False)
    eligible_amount = Column(Float, nullable=False, default=0.0)
    disbursed_amount = Column(Float, default=0.0, nullable=False)

    applied_date = Column(Date, nullable=True)
    approved_date = Column(Date, nullable=True)
    disbursed_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="subsidy_record")


class TechnicianPayout(Base):
    __tablename__ = "technician_payouts"

    id = Column(Integer, primary_key=True, index=True)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("installation_jobs.id"), nullable=False)
    hours = Column(Float, nullable=False)
    hourly_rate = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    is_paid = Column(Boolean, default=False, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    technician = relationship("User")
    job = relationship("InstallationJob")
