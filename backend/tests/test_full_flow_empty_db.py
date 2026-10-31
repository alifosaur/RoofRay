"""
Full chain on a brand-new empty database, using only accounts created through the API:
bootstrap admin → staff created by admin → customer self-registers → enquiry → lead → survey → quote →
payment → order → warehouse scan/stages → delivery → installation → invoice → subsidy → dashboards.
"""
import io
import os
import tempfile
from datetime import date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.bootstrap_admin import bootstrap_admin
from app.core.database import Base, get_db
from app.load_catalog import load_catalog
from app.main import app
from app.services.dispatch_service import add_years_to_date


@pytest.fixture()
def client():
    # E2E_BASE_URL: run the same chain over HTTP against a live server whose DB has only
    # `alembic upgrade head`, `bootstrap_admin --email owner@example.com --password owner-password` and `load_catalog`.
    if os.environ.get("E2E_BASE_URL"):
        import httpx
        with httpx.Client(base_url=os.environ["E2E_BASE_URL"], timeout=30) as c:
            yield c
        return
    path = os.path.join(tempfile.mkdtemp(prefix="empty_db_"), "empty.db")
    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(engine)

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _db
    db = Session()
    bootstrap_admin("owner@example.com", "Owner", "owner-password", db=db)
    load_catalog(db=db)
    db.close()
    yield TestClient(app)
    app.dependency_overrides.clear()


def login(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def create_staff(client, admin, email, name, role, rate=0):
    res = client.post("/api/users", headers=admin, json={"email": email, "full_name": name, "role": role, "hourly_rate": rate})
    assert res.status_code == 201, res.text
    token = res.json()["password_setup_url"].split("token=")[1]
    assert client.post("/api/auth/set-password", json={"token": token, "password": f"{role}-password"}).status_code == 200
    return login(client, email, f"{role}-password"), res.json()["user"]["id"]


def test_complete_chain_from_empty_database(client):
    admin = login(client, "owner@example.com", "owner-password")

    # ---- Before any data: every dashboard number is zero / empty, never sample values
    dash = client.get("/api/reports/dashboard?range=all", headers=admin).json()
    for k in ("total_revenue", "money_received", "money_spent", "pending_payments", "net_profit", "open_tickets_count"):
        assert dash[k] == 0, k
    assert dash["profit_series"] == [] and dash["profit_per_job"] == []
    assert all(v == 0 for v in dash["unfinished_by_stage"].values())
    assert client.get("/api/leads", headers=admin).json() == []

    # ---- Admin creates staff (they set their own password via the setup link)
    sales, sales_id = create_staff(client, admin, "sales@example.com", "Sales Person", "sales")
    tech, tech_id = create_staff(client, admin, "tech@example.com", "Field Tech", "technician", rate=600)
    wh, _ = create_staff(client, admin, "wh@example.com", "Warehouse Lead", "warehouse")
    assert client.get("/api/auth/me", headers=tech).json()["role"] == "technician"

    # ---- Customer self-registers (role forced to customer) and submits the enquiry
    reg = client.post("/api/auth/register", json={
        "email": "asha@example.com", "password": "customer-password", "full_name": "Asha Rao", "phone": "9876500011",
        "address": "12 MG Road", "city": "Pune", "pincode": "411001", "role": "admin",
    })
    assert reg.status_code == 201 and reg.json()["user"]["role"] == "customer"
    cust = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    pkgs = client.get("/api/customer/packages").json()
    assert len(pkgs) == 10 and all(p["gross_price"] > 0 for p in pkgs)
    assert all(not p["subsidy_eligible"] and p["subsidy_amount"] == 0 for p in pkgs if p["system_type"] == "Off-Grid")

    enq = client.post("/api/customer/enquiry", json={
        "name": "Asha Rao", "phone": "9876500011", "email": "asha@example.com", "address": "12 MG Road", "city": "Pune",
        "state": "Maharashtra", "pincode": "411001", "property_type": "Residential", "roof_type": "Concrete / Flat",
        "roof_length_ft": 30, "roof_width_ft": 20, "shadow_free_area_sqft": 450, "floor_number": 2,
        "monthly_bill_amount": 4200, "preferred_system_type": "On-Grid", "preferred_capacity_kw": 3,
    })
    assert enq.status_code == 201 and enq.json()["message"] == "Thank you! Our sales representative will contact you soon."
    lead_id = enq.json()["lead_id"]
    lead = client.get(f"/api/leads/{lead_id}", headers=sales).json()
    assert lead["assigned_to_id"] == sales_id
    assert any(n["title"] == "New lead assigned" for n in client.get("/api/notifications", headers=sales).json()["items"])
    assert client.get("/api/customer/tracker", headers=cust).json()["current_stage_key"] == "sales_contacted"

    # ---- Sales: call checklist, survey assignment (availability view), gate before approval
    assert client.post(f"/api/leads/{lead_id}/checklist", headers=sales, json={
        "shadow_free_area_sqft": 450, "monthly_bill_amount": 4200, "is_grid_suitable": True, "remarks": "Called"}).status_code == 200
    avail = client.get("/api/users/technicians/availability", headers=sales).json()
    assert [t["technician_id"] for t in avail["technicians"]] == [tech_id]
    survey = client.post("/api/surveys", headers=sales, json={"lead_id": lead_id, "technician_id": tech_id,
                                                                "scheduled_date": "2030-01-05T10:00:00"}).json()
    template = next(t for t in client.get("/api/bom-templates", headers=sales).json() if t["name"] == "3 kW On-Grid System")
    assert client.post("/api/quotes", headers=sales, json={"lead_id": lead_id, "template_id": template["id"]}).status_code == 400
    assert client.post(f"/api/surveys/{survey['id']}/approve", headers=sales).status_code == 400  # not submitted yet

    # ---- Technician submits the survey with a photo; sales is notified and approves
    assert [s["id"] for s in client.get("/api/surveys", headers=tech).json()] == [survey["id"]]
    photo = client.post(f"/api/surveys/{survey['id']}/photos", headers=tech,
                        files={"file": ("roof.jpg", io.BytesIO(b"jpeg"), "image/jpeg")})
    assert photo.status_code == 201, photo.text
    assert client.post(f"/api/surveys/{survey['id']}/photos", headers=tech,
                       files={"file": ("x.exe", io.BytesIO(b"MZ"), "application/octet-stream")}).status_code == 400
    sub = client.put(f"/api/surveys/{survey['id']}/complete", headers=tech, json={
        "address_confirmed": True, "roof_length_ft": 30, "roof_width_ft": 20, "shadow_free_area_sqft": 440,
        "out_of_shade_zone": True, "shade_notes": "Water tank on north side", "roof_direction": "South",
        "roof_tilt_deg": 18, "cable_distance_meters": 14, "feasible": True})
    # Technician confirms feasibility → survey approved, lead moves to SURVEY_APPROVED automatically, sales notified
    assert sub.status_code == 200 and sub.json()["status"] == "APPROVED"
    assert client.get(f"/api/leads/{lead_id}", headers=sales).json()["status"] == "SURVEY_APPROVED"
    assert any(n["title"] == "Site survey approved" for n in client.get("/api/notifications", headers=sales).json()["items"])

    # ---- Quote from template, BOM adjusted, sent, accepted by the customer
    quote = client.post("/api/quotes", headers=sales, json={"lead_id": lead_id, "template_id": template["id"]}).json()
    assert quote["subsidy_amount"] == 78000.0  # from the schemes table (3 kW On-Grid)
    assert client.get(f"/api/leads/{lead_id}", headers=sales).json()["status"] == "SURVEY_APPROVED"  # drafting is not quoting
    assert client.post(f"/api/customer/quotes/{quote['id']}/accept", headers=cust).status_code == 400  # not sent yet
    lines = [{"product_id": l["product_id"], "quantity": l["quantity"]} for l in quote["lines"]]
    mc4 = next(l for l in lines if l["quantity"] and any(q["product"]["sku"] == "SP-CON-MC4" and q["product_id"] == l["product_id"] for q in quote["lines"]))
    mc4["quantity"] += 1
    edited = client.put(f"/api/quotes/{quote['id']}/lines", headers=sales, json={"lines": lines})
    assert edited.status_code == 200 and edited.json()["total_amount"] > quote["total_amount"]
    assert client.post(f"/api/quotes/{quote['id']}/send", headers=sales).status_code == 200
    assert client.get(f"/api/leads/{lead_id}", headers=sales).json()["status"] == "QUOTED"
    portal_quotes = client.get("/api/customer/quotes", headers=cust)
    assert portal_quotes.status_code == 200 and [q["status"] for q in portal_quotes.json()] == ["SENT"]
    assert client.get("/api/customer/tracker", headers=cust).json()["current_stage_key"] == "order_confirmed"
    order_id = client.post(f"/api/customer/quotes/{quote['id']}/accept", headers=cust).json()["order_id"]
    assert client.get(f"/api/leads/{lead_id}", headers=sales).json()["status"] == "WON"

    # ---- Acceptance confirms the order and sends the pick list to the warehouse; payment follows
    order = client.get(f"/api/orders/{order_id}", headers=sales).json()
    assert order["status"] == "CONFIRMED" and order["pick_list_id"]
    advance_amt = round(order["total_amount"] * 0.4, 2)
    assert client.post(f"/api/orders/{order_id}/payments", headers=sales, json={"amount": advance_amt, "method": "UPI"}).status_code == 201
    assert any(n["title"] == "New pick list" for n in client.get("/api/notifications", headers=wh).json()["items"])
    invoice = client.get(f"/api/finance/invoices?order_id={order_id}", headers=admin).json()[0]
    assert invoice["invoice_type"] == "SALES" and invoice["status"] == "ISSUED"

    # ---- Warehouse: real stock purchases (catalogue starts at zero), scans, stages
    pick = next(p for p in client.get("/api/inventory/pick-lists", headers=wh).json() if p["order_id"] == order_id)
    for line in pick["lines"]:
        assert client.post("/api/inventory/purchases", headers=wh, json={
            "product_id": line["product_id"], "quantity": line["required_qty"] + 5, "unit_cost": line["product"]["cost_price"]}).status_code == 201
    assert all(j["order_id"] != order_id for j in client.get("/api/jobs/my-schedule", headers=tech).json())  # install job hidden
    final_quote = client.get(f"/api/quotes/{quote['id']}", headers=admin).json()
    for line in final_quote["lines"]:
        if not line["product"]["is_serialised"]:
            continue
        sns = [f"{line['product']['sku']}-{i:03d}" for i in range(line["quantity"])]
        assert client.post("/api/dispatch/serials/register", headers=wh, json={"product_id": line["product_id"], "serial_numbers": sns}).status_code == 201
        if line is final_quote["lines"][0]:
            assert client.put(f"/api/dispatch/orders/{order_id}/stage", headers=wh, json={"stage": "PACKING"}).status_code == 200
        for sn in sns:
            assert client.post("/api/dispatch/scan", headers=wh, json={"order_id": order_id, "serial_no": sn}).status_code == 200
    for stage in ("PACKED", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"):
        res = client.put(f"/api/dispatch/orders/{order_id}/stage", headers=wh, json={"stage": stage})
        assert res.status_code == 200, f"{stage}: {res.text}"
        assert client.get("/api/customer/tracker", headers=cust).status_code == 200

    # ---- Technician: job released on delivery with BOM + serials; start, photos, signature, complete
    job = next(j for j in client.get("/api/jobs/my-schedule", headers=tech).json() if j["order_id"] == order_id)
    assert job["customer_name"] == "Asha Rao" and job["bom"] and len(job["delivered_serials"]) > 0
    assert all(s["warranty_end"] for s in job["delivered_serials"])
    assert client.post(f"/api/jobs/{job['id']}/start", headers=tech).status_code == 200
    for i in range(2):
        assert client.post(f"/api/jobs/{job['id']}/photos", headers=tech,
                           files={"file": (f"p{i}.jpg", io.BytesIO(b"jpeg"), "image/jpeg")}).status_code == 201
    done = client.post(f"/api/jobs/{job['id']}/complete", headers=tech, json={
        "confirmed_capacity_kw": 3.24, "power_generating": True, "customer_name": "Asha Rao",
        "signature_data": "data:image/png;base64,iVBORw0KGgo=",
        "start_time": (datetime.utcnow() - timedelta(hours=3)).isoformat()})
    assert done.status_code == 200, done.text
    ts = done.json()["timesheet"]
    assert ts["hourly_rate"] == 600 and abs(ts["hours"] - 3) < 0.05 and abs(ts["total_cost"] - 1800) < 30
    assert client.get(f"/api/orders/{order_id}", headers=admin).json()["status"] == "INSTALLED"

    # ---- Balance paid → order closed, invoice paid, invoice PDF downloadable by the customer
    order = client.get(f"/api/orders/{order_id}", headers=admin).json()
    balance = round(order["total_amount"] - order["paid_amount"], 2)
    assert client.post(f"/api/orders/{order_id}/payments", headers=sales, json={"amount": balance, "method": "BANK"}).status_code == 201
    assert client.get(f"/api/orders/{order_id}", headers=admin).json()["status"] == "CLOSED"
    inv = client.get("/api/finance/invoices", headers=cust).json()
    assert len(inv) == 1 and inv[0]["status"] == "PAID"
    pdf = client.get(f"/api/finance/invoices/{inv[0]['id']}/pdf", headers=cust)
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"

    # ---- Customer sees serials with warranty dates computed from delivery
    equipment = client.get("/api/customer/equipment", headers=cust).json()
    assert equipment and all(e["warranty_end"] for e in equipment)
    tracker = client.get("/api/customer/tracker", headers=cust).json()
    assert [s["status"] for s in tracker["stages"][:12]] == ["COMPLETED"] * 12

    # ---- Subsidy tracker: strict step order with references, customer notified each time
    subsidy = client.get("/api/finance/subsidies", headers=cust).json()[0]
    skip = client.post(f"/api/finance/subsidies/{subsidy['id']}/steps", headers=admin, data={"status": "APPROVED"})
    assert skip.status_code == 400
    for step in ("ELIGIBILITY_CHECKED", "REGISTERED", "FEASIBILITY_APPROVED", "INSTALLATION_DONE"):
        res = client.post(f"/api/finance/subsidies/{subsidy['id']}/steps", headers=admin,
                          data={"status": step, "reference_no": f"REF-{step}"},
                          files={"document": ("proof.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")})
        assert res.status_code == 200, res.text
    sub = client.get("/api/finance/subsidies", headers=cust).json()[0]
    assert sub["status"] == "INSTALLATION_DONE" and len(sub["events"]) == 4 and sub["application_no"] == "REF-REGISTERED"
    assert sum("Subsidy status updated" == n["title"] for n in client.get("/api/notifications", headers=cust).json()["items"]) == 4

    # ---- Dashboard now shows real values computed from the chain
    dash = client.get("/api/reports/dashboard?range=all&granularity=month", headers=admin).json()
    assert dash["total_revenue"] == order["total_amount"]
    assert dash["money_received"] == round(advance_amt + balance, 2)
    assert dash["pending_payments"] == 0
    assert dash["spend_breakdown"]["stock_purchases"] > 0 and dash["spend_breakdown"]["technician_pay"] > 0
    job_row = dash["profit_per_job"][0]
    assert job_row["net_profit"] == round(job_row["revenue"] - job_row["stock_cost"] - job_row["technician_cost"] - job_row["other_costs"], 2)
    assert len(dash["profit_series"]) == 1 and dash["profit_series"][0]["period"] == date.today().strftime("%Y-%m")
    assert client.get("/api/reports/export.pdf?range=all", headers=admin).content[:4] == b"%PDF"
