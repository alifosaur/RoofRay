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
    category: Optional[str] = None,
    notify_user_ids: Optional[Iterable[Optional[int]]] = None,
    notify_roles: Optional[Iterable[UserRole]] = None,
) -> None:
    roles = [r for r in roles]
    user_ids = {u for u in user_ids if u}
    data = json.dumps(payload, default=str)

    if roles:
        db.add(OutboxEvent(event_type=event_type, payload=data, target_roles=",".join(r.value for r in roles)))
    for uid in user_ids:
        db.add(OutboxEvent(event_type=event_type, payload=data, target_user_id=uid))

    if title:
        # Determine notification category
        resolved_category = category
        if not resolved_category:
            if event_type.startswith("lead.") or (link and "/crm" in link):
                resolved_category = "CRM"
            elif event_type.startswith("survey.") or (link and "/survey" in link):
                resolved_category = "Surveys"
            elif event_type.startswith("job.") or (link and ("/technician" in link or "/jobs" in link)):
                resolved_category = "Installation"
            elif event_type.startswith("order.") or event_type.startswith("serial.") or (link and "/orders" in link):
                resolved_category = "Orders"
            elif event_type.startswith("ticket.") or (link and "/helpdesk" in link):
                resolved_category = "Helpdesk"
            elif event_type.startswith("finance.") or event_type.startswith("subsidy.") or event_type.startswith("payout."):
                resolved_category = "Finance"
            else:
                resolved_category = "General"

        # Targeted notification recipients:
        # If notify_user_ids is explicitly passed, use that; otherwise default to user_ids.
        if notify_user_ids is not None:
            recipients = {u for u in notify_user_ids if u}
        else:
            recipients = set(user_ids)

        if notify_roles is not None:
            recipients |= {u.id for u in db.query(User.id).filter(User.role.in_(list(notify_roles)), User.is_active == True).all()}

        for uid in recipients:
            db.add(Notification(user_id=uid, title=title, message=message or title, link=link, category=resolved_category))

    db.info["invalidate_dashboards"] = True


@event.listens_for(Session, "after_commit")
def _invalidate_after_commit(session: Session) -> None:
    if session.info.pop("invalidate_dashboards", False):
        cache.invalidate("dash:")
