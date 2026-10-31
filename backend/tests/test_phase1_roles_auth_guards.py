import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import UserRole
from app.models.order import OrderStatus

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


def test_login_unified_endpoint():
    """Verify login returns token and profile for customer and admin."""
    # Test customer login (supports both new @roofray.com and legacy @sunpower.com)
    cust_login = client.post("/api/auth/login", json={"email": "customer@roofray.com"})
    assert cust_login.status_code == 200
    assert cust_login.json()["user"]["role"] == "customer"

    # Test admin login
    admin_login = client.post("/api/auth/login", json={"email": "admin@test.local"})
    assert admin_login.status_code == 200
    assert admin_login.json()["user"]["role"] == "admin"


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

    techs = client.get("/api/users?role=technician", headers=admin_headers).json()
    tech1 = techs[0]
    tech2 = techs[1]

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
        "email": f"{u1}@example.com",
        "full_name": "Customer A",
        "phone": f"911{uuid.uuid4().hex[:7]}",
    })
    token_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    # Register customer B
    u2 = f"c2_{uuid.uuid4().hex[:6]}"
    res_b = client.post("/api/auth/register", json={
        "email": f"{u2}@example.com",
        "full_name": "Customer B",
        "phone": f"922{uuid.uuid4().hex[:7]}",
    })
    token_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # Fetch quotes as Admin to get an existing quote belonging to someone else
    admin_quotes = client.get("/api/quotes", headers=admin_headers).json()
    assert len(admin_quotes) > 0
    foreign_quote_id = admin_quotes[0]["id"]

    # Customer A attempting to view foreign quote MUST fail with 403 Forbidden!
    cust_view_quote = client.get(f"/api/quotes/{foreign_quote_id}", headers=token_a)
    assert cust_view_quote.status_code == 403

    # Customer B attempting to view foreign quote MUST fail with 403 Forbidden!
    cust_b_view = client.get(f"/api/quotes/{foreign_quote_id}", headers=token_b)
    assert cust_b_view.status_code == 403

    # Customer attempting to view foreign order
    admin_orders = client.get("/api/orders", headers=admin_headers).json()
    assert len(admin_orders) > 0
    foreign_order_id = admin_orders[0]["id"]

    cust_view_order = client.get(f"/api/orders/{foreign_order_id}", headers=token_a)
    assert cust_view_order.status_code == 403


def test_warehouse_cannot_view_unconfirmed_draft_orders():
    """Verify warehouse can only access orders in packing or dispatch stages."""
    # Check that warehouse lists orders and none are in DRAFT
    wh_orders = client.get("/api/orders", headers=warehouse_headers).json()
    for o in wh_orders:
        assert o["status"] in ["CONFIRMED", "PACKED", "DISPATCHED", "DELIVERED"]

