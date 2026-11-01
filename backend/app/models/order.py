import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class OrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PACKING = "PACKING"
    PACKED = "PACKED"
    DISPATCHED = "DISPATCHED"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    INSTALLED = "INSTALLED"
    CLOSED = "CLOSED"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(64), unique=True, index=True, nullable=False)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    status = Column(Enum(OrderStatus), default=OrderStatus.DRAFT, nullable=False)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)

    confirmed_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    installed_at = Column(DateTime, nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    quote = relationship("Quote", back_populates="order")
    customer = relationship("Customer", back_populates="orders")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    pick_list = relationship("PickList", back_populates="order", uselist=False)
    serial_items = relationship("SerialItem", back_populates="order")
    installation_job = relationship("InstallationJob", back_populates="order", uselist=False)
    invoices = relationship("Invoice", back_populates="order", cascade="all, delete-orphan", foreign_keys="[Invoice.order_id]")
    subsidy_record = relationship("SubsidyRecord", back_populates="order", uselist=False)

    @property
    def invoice(self):
        if not self.invoices:
            return None
        for inv in self.invoices:
            if "FINAL" in inv.invoice_number or inv.total_amount >= self.total_amount - 0.01:
                return inv
        return self.invoices[0]

    @property
    def advance_invoice(self):
        if not self.invoices:
            return None
        for inv in self.invoices:
            if "ADV" in inv.invoice_number:
                return inv
        return None

    @property
    def final_invoice(self):
        if not self.invoices:
            return None
        for inv in self.invoices:
            if "FINAL" in inv.invoice_number or inv.total_amount >= self.total_amount - 0.01:
                return inv
        return None

    @property
    def invoice_id(self):
        return self.invoice.id if self.invoice else None

    @property
    def pick_list_id(self):
        return self.pick_list.id if self.pick_list else None

    @property
    def capacity_kw(self):
        return self.quote.template.capacity_kw if (self.quote and self.quote.template) else None

    @property
    def system_type(self):
        return self.quote.template.system_type if (self.quote and self.quote.template) else None

    @property
    def customer_name(self):
        return self.customer.name if self.customer else (self.quote.lead.name if (self.quote and self.quote.lead) else None)

    @property
    def customer_phone(self):
        return self.customer.phone if self.customer else (self.quote.lead.phone if (self.quote and self.quote.lead) else None)

    @property
    def customer_address(self):
        c = self.customer
        if c and c.address:
            parts = [p for p in (c.address, c.city, c.pincode) if p]
            if parts:
                return ", ".join(parts)
        if self.quote and self.quote.lead:
            l = self.quote.lead
            parts = [p for p in (l.address, l.city, l.state, l.pincode) if p]
            return ", ".join(parts) if parts else l.address
        return None
