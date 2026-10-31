from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.serial import SerialItem, SerialStatus
from app.models.customer import Customer
from app.models.product import Product

client = TestClient(app)
admin_headers = {"Authorization": "Bearer admin_uid"}
support_headers = {"Authorization": "Bearer support_uid"}
sales_headers = {"Authorization": "Bearer sales_uid"}


def test_warranty_lookup_and_ticket_billing_gate():
    # Setup test customer with two serials: one in-warranty, one out-of-warranty
    db = SessionLocal()
    cust = Customer(
        name="Deepa Sharma",
        phone="9818818818",
        address="A-45 Preet Vihar, Delhi",
    )
    db.add(cust)
    db.flush()

    prod = db.query(Product).first()

    today = date.today()
    # In-warranty serial (expires in 1 year)
    s_in = SerialItem(
        serial_no="INV-IN-WARRANTY-1234",
        product_id=prod.id,
        customer_id=cust.id,
        status=SerialStatus.INSTALLED,
        delivered_on=today - timedelta(days=100),
        warranty_end=today + timedelta(days=265),
    )
    # Out-of-warranty serial (expired 6 months ago)
    s_out = SerialItem(
        serial_no="INV-OUT-WARRANTY-5678",
        product_id=prod.id,
        customer_id=cust.id,
        status=SerialStatus.INSTALLED,
        delivered_on=today - timedelta(days=900),
        warranty_end=today - timedelta(days=170),
    )
    db.add(s_in)
    db.add(s_out)
    db.commit()
    cust_id = cust.id
    s_in_id = s_in.id
    s_out_id = s_out.id
    db.close()

    # 1. TEST SUPPORT LOOKUP
    lookup_by_serial = client.get("/api/tickets/lookup?query=INV-IN-WARRANTY-1234", headers=support_headers)
    assert lookup_by_serial.status_code == 200
    res1 = lookup_by_serial.json()[0]
    assert res1["customer_name"] == "Deepa Sharma"
    assert res1["in_warranty"] is True
    assert res1["days_left"] > 0

    lookup_by_phone = client.get("/api/tickets/lookup?query=9818818818", headers=support_headers)
    assert lookup_by_phone.status_code == 200
    assert len(lookup_by_phone.json()) == 2

    # 2. CREATE TICKET FOR IN-WARRANTY SERIAL -> is_billable MUST BE False
    ticket_in = client.post("/api/tickets", headers=support_headers, json={
        "customer_id": cust_id,
        "serial_item_id": s_in_id,
        "subject": "Inverter Error Code E04",
        "description": "System stopped generating power this morning",
    }).json()
    assert ticket_in["is_billable"] is False
    assert ticket_in["status"] == "OPEN"

    # 3. CREATE TICKET FOR OUT-OF-WARRANTY SERIAL -> is_billable MUST BE True
    ticket_out = client.post("/api/tickets", headers=support_headers, json={
        "customer_id": cust_id,
        "serial_item_id": s_out_id,
        "subject": "Battery charging degraded",
        "description": "Backup duration dropped from 4 hours to 30 mins",
    }).json()
    assert ticket_out["is_billable"] is True
    t_out_id = ticket_out["id"]

    # 4. RESOLVE OUT-OF-WARRANTY TICKET -> Auto-generates repair invoice
    resolve_res = client.put(f"/api/tickets/{t_out_id}/resolve", headers=support_headers, json={
        "resolution_notes": "Replaced DC fuse and re-calibrated BMS settings.",
        "parts_cost": 2500.0,
        "labour_cost": 1200.0,
    })
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
    assert resolve_res.json()["repair_cost"] == 3700.0

    # 5. CLOSE TICKET GATE CHECK:
    # Attempt to close ticket before customer confirmation -> MUST FAIL (HTTP 400)
    premature_close = client.post(f"/api/tickets/{t_out_id}/close", headers=support_headers)
    assert premature_close.status_code == 400
    assert "cannot be closed without customer confirmation" in premature_close.json()["detail"]

    # Record Customer Confirmation
    confirm_res = client.post(f"/api/tickets/{t_out_id}/customer-confirm", headers=support_headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CUSTOMER_CONFIRMED"
    assert confirm_res.json()["customer_confirmed_at"] is not None

    # NOW close ticket -> Succeeded!
    close_res = client.post(f"/api/tickets/{t_out_id}/close", headers=support_headers)
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"
    assert close_res.json()["closed_at"] is not None
