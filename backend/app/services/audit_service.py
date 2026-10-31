import enum
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def _fmt(v: Any) -> str:
    return v.value if isinstance(v, enum.Enum) else str(v)


def apply_changes(db: Session, record_type: str, obj: Any, updates: Dict[str, Any], user_id: int) -> None:
    """Sets fields on obj and writes one audit entry listing every changed field as old → new."""
    changes = []
    for field, new in updates.items():
        old = getattr(obj, field)
        if old != new:
            setattr(obj, field, new)
            changes.append(f"{field}: {_fmt(old)} → {_fmt(new)}")
    if changes:
        db.add(AuditLog(
            record_type=record_type,
            record_id=obj.id,
            action="EDITED",
            notes="; ".join(changes),
            user_id=user_id,
        ))
