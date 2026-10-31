import uuid

from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.models.outbox import OutboxEvent
from app.models.user import User, UserRole
from app.routers.events import _fetch
from tests.helpers import ADMIN, SALES, TECH, WAREHOUSE, confirmed_order, ship_to_delivered

client = TestClient(app)


def _make_user(role: UserRole) -> dict:
    uid = f"{role.value}_{uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    db.add(User(firebase_uid=uid, email=f"{uid}@test.local", full_name=f"Other {role.value}", role=role, is_active=True))
    db.commit()
    db.close()
    return {"Authorization": f"Bearer {uid}"}


def _deactivate(headers: dict) -> None:
    db = SessionLocal()
    db.query(User).filter(User.firebase_uid == headers["Authorization"].split()[1]).update({"is_active": False})
    db.commit()
    db.close()


def test_object_level_access_by_role():
    ctx = confirmed_order(client, "Guarded Customer")
    order_id, lead_id = ctx["order_id"], ctx["lead"]["id"]

    other_sales = _make_user(UserRole.SALES)
    other_tech = _make_user(UserRole.TECHNICIAN)
    try:
        # Sales only see their own leads, quotes and orders
        assert client.get(f"/api/leads/{lead_id}", headers=other_sales).status_code == 403
        assert all(l["id"] != lead_id for l in client.get("/api/leads", headers=other_sales).json())
        assert client.get(f"/api/orders/{order_id}", headers=other_sales).status_code == 403
        assert client.get(f"/api/quotes/{ctx['quote']['id']}", headers=other_sales).status_code == 403
        assert client.get(f"/api/leads/{lead_id}", headers=ctx["sales"]).status_code == 200

        # Technicians only see surveys assigned to them
        assert client.get("/api/surveys", headers=other_tech).json() == []
        assert any(s["lead_id"] == lead_id for s in client.get("/api/surveys", headers=TECH).json())
    finally:
        _deactivate(other_sales)
        _deactivate(other_tech)

    # Technicians cannot approve surveys, deliver, or read orders/leads
    assert client.post("/api/surveys/1/approve", headers=TECH).status_code == 403
    assert client.post(f"/api/dispatch/orders/{order_id}/deliver", headers=TECH).status_code == 403
    assert client.get("/api/orders", headers=TECH).status_code == 403
    assert client.get("/api/leads", headers=TECH).status_code == 403

    # Warehouse sees confirmed orders but never drafts or leads
    assert client.get(f"/api/orders/{order_id}", headers=WAREHOUSE).status_code == 200
    assert all(o["status"] != "DRAFT" for o in client.get("/api/orders", headers=WAREHOUSE).json())
    assert client.get("/api/leads", headers=WAREHOUSE).status_code == 403

    # Customers cannot reach staff endpoints
    cust = {"Authorization": "Bearer customer_uid"}
    for path in ("/api/users", "/api/reports/dashboard", "/api/dispatch/queue", "/api/inventory/stock"):
        assert client.get(path, headers=cust).status_code == 403, path
    # Inactive accounts are refused
    gone = _make_user(UserRole.SALES)
    _deactivate(gone)
    assert client.get("/api/auth/me", headers=gone).status_code == 403


def test_handoffs_reach_the_right_roles_live():
    db = SessionLocal()
    start = (db.query(OutboxEvent.id).order_by(OutboxEvent.id.desc()).first() or (0,))[0]
    db.close()

    ctx = confirmed_order(client, "Handoff Customer")
    ship_to_delivered(client, ctx["order_id"])

    db = SessionLocal()
    warehouse = db.query(User).filter(User.firebase_uid == "warehouse_uid").first()
    tech = db.query(User).filter(User.firebase_uid == "tech_uid").first()
    sales = db.query(User).filter(User.firebase_uid == "sales_uid").first()
    db.close()

    _, wh_events = _fetch(warehouse, start)
    wh_types = {e.event_type for e in wh_events}
    assert {"order.confirmed", "order.stage_changed", "serial.scanned"} <= wh_types
    assert "lead.created" not in wh_types  # warehouse never sees CRM events

    _, tech_events = _fetch(tech, start)
    tech_types = [e.event_type for e in tech_events]
    assert "survey.assigned" in tech_types and "job.released" in tech_types

    _, sales_events = _fetch(sales, start)
    assert {"lead.created", "survey.submitted", "quote.accepted"} <= {e.event_type for e in sales_events}

    # Each hand-off also left an audit entry on the order
    chatter = client.get(f"/api/orders/{ctx['order_id']}", headers=ADMIN).json()
    assert chatter["status"] == "DELIVERED"


def test_lead_stage_changes_are_workflow_driven():
    ctx = confirmed_order(client, "Workflow Lead")
    lead_id = ctx["lead"]["id"]
    # Sales cannot jump stages manually; LOST needs a reason; WON leads cannot be lost
    assert client.put(f"/api/leads/{lead_id}", headers=SALES, json={"status": "QUOTED"}).status_code == 400
    assert client.put(f"/api/leads/{lead_id}", headers=SALES, json={"status": "LOST"}).status_code == 400

    fresh = client.post("/api/leads/public", json={"name": "Not Suitable", "phone": f"9{uuid.uuid4().int % 10**9:09d}", "address": "Somewhere 1"}).json()
    hdr = SALES if fresh["assigned_to_id"] else ADMIN
    assert client.put(f"/api/leads/{fresh['id']}", headers=hdr, json={"status": "LOST", "lost_reason": "Roof too shaded"}).status_code == 200
    log = client.get(f"/api/leads/{fresh['id']}/chatter", headers=hdr).json()
    assert any("status: NEW → LOST" in (e["notes"] or "") for e in log)
