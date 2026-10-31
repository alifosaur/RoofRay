import asyncio
import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from sqlalchemy import or_

from app.core import security
from app.core.database import SessionLocal
from app.models.outbox import OutboxEvent
from app.models.user import User, UserRole

router = APIRouter(tags=["Live Events"])

POLL_SECONDS = 2
HEARTBEAT_SECONDS = 15


def _authenticate(token: str) -> User:
    db = SessionLocal()
    try:
        uid = security.verify_token(token)["uid"]
        user = db.query(User).filter(User.firebase_uid == uid, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=401, detail="Unknown or inactive user")
        db.expunge(user)
        return user
    finally:
        db.close()


def _fetch(user: User, after_id: Optional[int]):
    db = SessionLocal()
    try:
        if after_id is None:
            last = db.query(OutboxEvent.id).order_by(OutboxEvent.id.desc()).first()
            return (last[0] if last else 0), []
        q = db.query(OutboxEvent).filter(OutboxEvent.id > after_id)
        if user.role != UserRole.ADMIN:  # admin sees every event
            q = q.filter(or_(
                OutboxEvent.target_user_id == user.id,
                OutboxEvent.target_roles.like(f"%{user.role.value}%"),
            ))
        rows = q.order_by(OutboxEvent.id).limit(200).all()
        newest = db.query(OutboxEvent.id).order_by(OutboxEvent.id.desc()).first()
        return (newest[0] if newest else after_id), rows
    finally:
        db.close()


@router.get("/events")
async def stream_events(request: Request, token: str = Query(...)):
    """
    Server-Sent Events stream of hand-offs relevant to the signed-in user (EventSource cannot send headers,
    so the token comes in the query string). Reads the transactional outbox, so it works across workers.
    """
    user = await run_in_threadpool(_authenticate, token)
    resume = request.headers.get("last-event-id")

    async def gen():
        last_id = int(resume) if resume and resume.isdigit() else None
        last_id, _ = (last_id, None) if last_id is not None else await run_in_threadpool(_fetch, user, None)
        idle = 0
        yield "retry: 3000\n\n"
        while not await request.is_disconnected():
            newest, rows = await run_in_threadpool(_fetch, user, last_id)
            for ev in rows:
                yield f"id: {ev.id}\nevent: {ev.event_type}\ndata: {json.dumps({'type': ev.event_type, **json.loads(ev.payload)})}\n\n"
            last_id = max(last_id, newest)
            idle = 0 if rows else idle + POLL_SECONDS
            if idle >= HEARTBEAT_SECONDS:
                yield ": keep-alive\n\n"
                idle = 0
            await asyncio.sleep(POLL_SECONDS)

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
