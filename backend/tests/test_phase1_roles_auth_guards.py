import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import UserRole
from app.models.order import OrderStatus
from tests.helpers import confirmed_order, SALES, call_checklist, send_and_accept, confirm_with_advance, ship_to_delivered, scan_all_serials, advance

client = TestClient(app)

admin_headers = {"Authorization": "Bearer admin_uid"}
sales_headers = {"Authorization": "Bearer sales_uid"}
sales2_headers = {"Authorization": "Bearer sales2_uid"}
warehouse_headers = {"Authorization": "Bearer warehouse_uid"}
tech1_headers = {"Authorization": "Bearer tech_uid_1"}
tech2_headers = {"Authorization": "Bearer tech_uid_2"}
customer_headers = {"Authorization": "Bearer customer_uid"}


def test_public_self_registration_creates_only_customer_and_links_customer_row():
    """Verify that public registration strictly creates role=customer and links Customer record."""
    unique_suffix = uuid.uuid4().hex[:6]
    email = f"user_{unique_suffix}@example.com"
    phone = f"999{unique_suffix[:7]}"

    reg_payload = {
        "password": "testpass123",
        "email": email,
        "full_name": "Test Customer",
        "phone": phone,
        "address": "45 Green Park, Delhi",
        "city": "New Delhi",
        "pincode": "110016",
        # Privilege escalation attempt: client tries to pass role=admin!
        "role": "admin",
    }

    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    user_info = data["user"]

    # SECURITY GATE: Role MUST be customer, never admin!
    assert user_info["role"] == "customer"
    assert user_info["customer_id"] is not None

    # Verify GET /auth/me with the issued token
    token_headers = {"Authorization": f"Bearer {data['access_token']}"}
    me_res = client.get("/api/auth/me", headers=token_headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "customer"
    assert me_res.json()["customer_id"] == user_info["customer_id"]


def test_login_requires_correct_password():
    """Login checks the password; the returned token works on /auth/me; staff self-registration is gone."""
    email = f"login_{uuid.uuid4().hex[:6]}@example.com"
    reg = client.post("/api/auth/register", json={
        "email": email, "password": "correct-horse", "full_name": "Login Test", "phone": f"955{uuid.uuid4().hex[:7]}",
    })
    assert reg.status_code == 201

    assert client.post("/api/auth/login", json={"email": email, "password": "wrong-password"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email}).status_code == 422
    ok = client.post("/api/auth/login", json={"email": email, "password": "correct-horse"})
    assert ok.status_code == 200
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {ok.json()['access_token']}"})
    assert me.status_code == 200 and me.json()["role"] == "customer"

    # Forged / unsigned tokens are rejected
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"}).status_code == 401
    # Public staff self-registration no longer exists
    assert client.post("/api/auth/staff-register", json={"email": "x@example.com", "role": "admin"}).status_code in (404, 405)
    # Short passwords are refused
    assert client.post("/api/auth/register", json={
        "email": f"short_{uuid.uuid4().hex[:6]}@example.com", "password": "123", "full_name": "Short", "phone": "9000000001",
    }).status_code == 400


def test_admin_creates_staff_with_password_setup_link():
    email = f"staff_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/users", headers=admin_headers, json={
        "email": email, "full_name": "New Tech", "role": "technician", "hourly_rate": 550,
    })
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["user"]["role"] == "technician" and body["user"]["hourly_rate"] == 550
    assert body["password_setup_url"].startswith("/set-password?token=")

    # Non-admins cannot create staff; customers cannot be created here
    assert client.post("/api/users", headers=customer_headers, json={"email": "a@example.com", "full_name": "Ann", "role": "sales"}).status_code == 403
    assert client.post("/api/users", headers=admin_headers, json={"email": "b@example.com", "full_name": "Bee", "role": "customer"}).status_code == 400

    token = body["password_setup_url"].split("token=")[1]
    assert client.post("/api/auth/set-password", json={"token": token, "password": "tech-password-1"}).status_code == 200
    login = client.post("/api/auth/login", json={"email": email, "password": "tech-password-1"})
    assert login.status_code == 200 and login.json()["user"]["role"] == "technician"


def test_customer_privilege_escalation_blocked():
    """Verify that customers are blocked with 403 Forbidden on staff endpoints."""
    # 1. Customer cannot access internal inventory stock
    inv_res = client.get("/api/inventory/stock", headers=customer_headers)
    assert inv_res.status_code == 403

    # 2. Customer cannot scan serials for warehouse dispatch
    scan_res = client.post("/api/dispatch/scan", headers=customer_headers, json={
        "order_id": 1,
        "serial_no": "TEST-SERIAL"
    })
    assert scan_res.status_code == 403

    # 3. Customer cannot access executive director profit reports
    rep_res = client.get("/api/reports/dashboard", headers=customer_headers)
    assert rep_res.status_code == 403

    # 4. Customer cannot schedule or complete technician surveys
    surv_res = client.get("/api/surveys", headers=customer_headers)
    assert surv_res.status_code == 403


def test_technician_object_level_isolation():
    """Verify technician can only access surveys and jobs assigned to them, not another technician's."""
    # 1. Create a lead and assign survey to Tech 1
    lead_res = client.post("/api/leads/public", json={
        "name": "Tech Isolation Test",
        "phone": f"987{uuid.uuid4().hex[:7]}",
        "address": "Delhi NCR",
        "required_capacity": 3.0,
    })
    lead_id = lead_res.json()["id"]

    techs = [t for t in client.get("/api/users?role=technician", headers=admin_headers).json() if t["is_active"]]
    tech1 = techs[0]
    tech2 = techs[1]

    call_checklist(client, lead_id, sales_headers)
    survey_res = client.post("/api/surveys", headers=sales_headers, json={
        "lead_id": lead_id,
        "technician_id": tech1["id"],
        "scheduled_date": "2026-11-01T10:00:00",
    })
    survey_id = survey_res.json()["id"]

    # Tech 1 can view their own survey
    t1_headers = {"Authorization": f"Bearer {tech1['firebase_uid']}"}
    t2_headers = {"Authorization": f"Bearer {tech2['firebase_uid']}"}

    t1_view = client.get(f"/api/surveys/{survey_id}", headers=t1_headers)
    assert t1_view.status_code == 200

    # Tech 2 attempting to view Tech 1's survey MUST fail with 403 Forbidden!
    t2_view = client.get(f"/api/surveys/{survey_id}", headers=t2_headers)
    assert t2_view.status_code == 403
    assert "Forbidden" in t2_view.json()["detail"]

    # Tech 2 attempting to complete Tech 1's survey MUST fail with 403 Forbidden!
    t2_comp = client.put(f"/api/surveys/{survey_id}/complete", headers=t2_headers, json={
        "roof_direction": "South", "roof_tilt_deg": 20.0, "cable_distance_meters": 10.0
    })
    assert t2_comp.status_code == 403


def test_customer_object_level_isolation():
    """Verify that a customer cannot view another customer's quotes, orders, or invoices."""
    # Register customer A
    u1 = f"c1_{uuid.uuid4().hex[:6]}"
    res_a = client.post("/api/auth/register", json={
        "password": "testpass123",
        "email": f"{u1}@example.com",
        "full_name": "Customer A",
        "phone": f"911{uuid.uuid4().hex[:7]}",
    })
    token_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    # Register customer B
    u2 = f"c2_{uuid.uuid4().hex[:6]}"
    res_b = client.post("/api/auth/register", json={
        "password": "testpass123",
        "email": f"{u2}@example.com",
        "full_name": "Customer B",
        "phone": f"922{uuid.uuid4().hex[:7]}",
    })
    token_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # A quote and order that belong to a different customer
    foreign = confirmed_order(client, "Foreign Customer")
    foreign_quote_id = foreign["quote"]["id"]

    # Customer A attempting to view foreign quote MUST fail with 403 Forbidden!
    cust_view_quote = client.get(f"/api/quotes/{foreign_quote_id}", headers=token_a)
    assert cust_view_quote.status_code == 403

    # Customer B attempting to view foreign quote MUST fail with 403 Forbidden!
    cust_b_view = client.get(f"/api/quotes/{foreign_quote_id}", headers=token_b)
    assert cust_b_view.status_code == 403

    # Customer attempting to view foreign order
    foreign_order_id = foreign["order_id"]

    cust_view_order = client.get(f"/api/orders/{foreign_order_id}", headers=token_a)
    assert cust_view_order.status_code == 403


def test_warehouse_cannot_view_unconfirmed_draft_orders():
    """Verify warehouse can only access orders in packing or dispatch stages."""
    # Check that warehouse lists orders and none are in DRAFT
    wh_orders = client.get("/api/orders", headers=warehouse_headers).json()
    for o in wh_orders:
        assert o["status"] in ["CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED"]



def test_admin_can_set_staff_password_directly():
    email = f"direct_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/users", headers=admin_headers, json={
        "email": email, "full_name": "Direct Sales", "role": "sales", "password": "initial-pass-1"})
    assert res.status_code == 201 and res.json()["password_setup_url"] is None
    assert client.post("/api/auth/login", json={"email": email, "password": "initial-pass-1"}).status_code == 200

    uid = res.json()["user"]["id"]
    assert client.post(f"/api/users/{uid}/password", headers=customer_headers, json={"password": "x" * 8}).status_code == 403
    assert client.post(f"/api/users/{uid}/password", headers=admin_headers, json={"password": "short"}).status_code == 422
    assert client.post(f"/api/users/{uid}/password", headers=admin_headers, json={"password": "reset-pass-2"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": email, "password": "initial-pass-1"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": "reset-pass-2"}).status_code == 200
    # Leave no extra active sales user behind (leads are round-robined across active sales users)
    client.put(f"/api/users/{uid}", headers=admin_headers, json={"is_active": False})


def test_admin_removes_staff_or_deactivates_when_history_exists():
    fresh = client.post("/api/users", headers=admin_headers, json={
        "email": f"rm_{uuid.uuid4().hex[:6]}@example.com", "full_name": "Temp Warehouse", "role": "warehouse", "password": "temp-pass-1"}).json()["user"]
    assert client.delete(f"/api/users/{fresh['id']}", headers=customer_headers).status_code == 403
    res = client.delete(f"/api/users/{fresh['id']}", headers=admin_headers)
    assert res.status_code == 200 and res.json()["removed"] is True
    assert client.get(f"/api/users/{fresh['id']}", headers=admin_headers).status_code == 404

    # A technician with assigned work is deactivated, not deleted
    tech = client.post("/api/users", headers=admin_headers, json={
        "email": f"rmt_{uuid.uuid4().hex[:6]}@example.com", "full_name": "Busy Tech", "role": "technician", "password": "temp-pass-1"}).json()["user"]
    lead = client.post("/api/leads/public", json={"name": "Hist Lead", "phone": f"93{uuid.uuid4().int % 10**8:08d}", "address": "1 Road"}).json()
    hdr = sales_headers if lead["assigned_to_id"] else admin_headers
    call_checklist(client, lead["id"], hdr)
    assert client.post("/api/surveys", headers=hdr, json={"lead_id": lead["id"], "technician_id": tech["id"], "scheduled_date": "2030-02-01T10:00:00"}).status_code == 201
    res = client.delete(f"/api/users/{tech['id']}", headers=admin_headers)
    assert res.status_code == 200 and res.json()["deactivated"] is True
    assert client.get(f"/api/users/{tech['id']}", headers=admin_headers).json()["is_active"] is False

    me = client.get("/api/auth/me", headers=admin_headers).json()
    assert client.delete(f"/api/users/{me['id']}", headers=admin_headers).status_code == 400


def test_leads_without_active_sales_owner_are_reassigned():
    from app.core.database import SessionLocal
    from app.models.lead import Lead
    lead = client.post("/api/leads/public", json={"name": "Orphan Lead", "phone": f"94{uuid.uuid4().int % 10**8:08d}", "address": "2 Road"}).json()
    db = SessionLocal()
    db.query(Lead).filter(Lead.id == lead["id"]).update({"assigned_to_id": None})
    db.commit()
    db.close()
    # Creating / reactivating a sales user hands out ownerless open leads
    temp = client.post("/api/users", headers=admin_headers, json={
        "email": f"rr_{uuid.uuid4().hex[:6]}@example.com", "full_name": "New Sales", "role": "sales", "password": "temp-pass-1"}).json()["user"]
    owner = client.get(f"/api/leads/{lead['id']}", headers=admin_headers).json()["assigned_to_id"]
    assert owner is not None
    client.put(f"/api/users/{temp['id']}", headers=admin_headers, json={"is_active": False})
    # Deactivating the owner moves its open leads to a remaining active sales user
    owner_after = client.get(f"/api/leads/{lead['id']}", headers=admin_headers).json()["assigned_to_id"]
    assert owner_after is not None and owner_after != temp["id"]
