from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def list_my_notifications(
    limit: int = 50,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if category and category.lower() != "all":
        query = query.filter(Notification.category.ilike(category))
    rows = query.order_by(Notification.created_at.desc()).limit(min(limit, 100)).all()
    unread = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
    return {
        "unread_count": unread,
        "items": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "link": n.link,
                "category": n.category or "General",
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in rows
        ],
    }


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"ok": True}
