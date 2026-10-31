from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class BOMTemplate(Base):
    __tablename__ = "bom_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)  # e.g., "3 kW On-Grid System"
    capacity_kw = Column(Float, nullable=False)
    system_type = Column(String(64), nullable=False)  # "On-Grid", "Off-Grid"
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lines = relationship("BOMLine", back_populates="template", cascade="all, delete-orphan")


class BOMLine(Base):
    __tablename__ = "bom_lines"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("bom_templates.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    template = relationship("BOMTemplate", back_populates="lines")
    product = relationship("Product", back_populates="bom_lines")

