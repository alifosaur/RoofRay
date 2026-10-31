"""
Hand-off events: one call writes the notification rows and the outbox row(s) in the caller's transaction.
After the transaction commits, dashboard caches are invalidated so the next read recomputes from the DB.
"""
import json
from typing import Iterable, Optional

from sqlalchemy import event
from sqlalchemy.orm import Session

from app.core import cache
from app.models.notification import Notification
from app.models.outbox import OutboxEvent
from app.models.user import User, UserRole


def emit(
    db: Session,
    event_type: str,
    payload: dict,
    roles: Iterable[UserRole] = (),
    user_ids: Iterable[Optional[int]] = (),
    title: Optional[str] = None,
    message: Optional[str] = None,
    link: Optional[str] = None,
) -> None:
    roles = [r for r in roles]
    user_ids = {u for u in user_ids if u}
    data = json.dumps(payload, default=str)

    if roles:
        db.add(OutboxEvent(event_type=event_type, payload=data, target_roles=",".join(r.value for r in roles)))
    for uid in user_ids:
        db.add(OutboxEvent(event_type=event_type, payload=data, target_user_id=uid))

    if title:
        recipients = set(user_ids)
        if roles:
            recipients |= {u.id for u in db.query(User.id).filter(User.role.in_(roles), User.is_active == True).all()}
        for uid in recipients:
            db.add(Notification(user_id=uid, title=title, message=message or title, link=link))

    db.info["invalidate_dashboards"] = True


@event.listens_for(Session, "after_commit")
def _invalidate_after_commit(session: Session) -> None:
    if session.info.pop("invalidate_dashboards", False):
        cache.invalidate("dash:")
