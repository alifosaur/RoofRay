import uuid
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from tests.helpers import register
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.lead import Lead, LeadStatus
from app.models.quote import Quote, QuoteStatus
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.serial import SerialItem, SerialStatus
from app.models.scheme import GovernmentScheme

client = TestClient(app)


def _ensure_demo_customer_enquiry():
    """The logged-in demo customer needs a profile; it is created by submitting an enquiry with their email."""
    client.post("/api/customer/enquiry", json={
        "name": "Portal Customer",
        "phone": "+91 98110 00007",
        "email": "customer@roofray.com",
        "address": "12 Test Street",
        "preferred_capacity_kw": 3.0,
    })


def test_customer_enquiry_submission_and_round_robin():
    """Customer submits details & measurements form; lead created, sales assigned."""
    unique_phone = f"+91 99{uuid.uuid4().int % 100000000:08d}"
    unique_email = f"portal_cust_{uuid.uuid4().hex[:6]}@example.com"

    payload = {
        "name": "Aarav Sharma",
        "phone": unique_phone,
        "email": unique_email,
        "address": "Flat 301, Sunshine Heights, Hinjewadi",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411057",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length_ft": 25.0,
        "roof_width_ft": 20.0,
        "shadow_free_area_sqft": 450.0,
        "floor_number": 3,
        "roof_direction": "South",
        "monthly_bill_amount": 4200.0,
        "preferred_system_type": "On-Grid",
        "preferred_capacity_kw": 3.0,
        "notes": "Looking for PM Surya Ghar subsidy benefits",
    }

    res = client.post("/api/customer/enquiry", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["message"] == "Thank you! Our sales representative will contact you soon."
    assert "lead_id" in data
    lead_id = data["lead_id"]

    # Verify database state
    db = SessionLocal()
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    assert lead is not None
    assert lead.source == "customer_portal"
    assert lead.roof_area_sqft == 500.0  # 25 * 20
    assert lead.assigned_to_id is not None
    # Measurements live on the lead; the call checklist is recorded by sales after calling
    assert lead.monthly_bill_amount == 4200.0
    assert lead.call_checklist is None
    db.close()


def test_customer_tracker_13_stages():
    """Customer views 13-stage project tracker."""
    demo_cust_headers = {"Authorization": "Bearer customer_uid"}
    _ensure_demo_customer_enquiry()

    res = client.get("/api/customer/tracker", headers=demo_cust_headers)
    assert res.status_code == 200
    data = res.json()

    assert "current_stage_key" in data
    assert "current_stage_name" in data
    stages = data["stages"]
    assert len(stages) == 13

    stage_keys = [s["key"] for s in stages]
    expected_keys = [
        "enquiry", "sales_contacted", "survey_scheduled", "survey_done",
        "quotation_ready", "order_confirmed", "packing", "dispatched",
        "out_for_delivery", "delivered", "installation_scheduled", "installed", "subsidy"
    ]
    assert stage_keys == expected_keys

    # Each stage must have status and title
    for s in stages:
        assert s["status"] in ["COMPLETED", "CURRENT", "PENDING"]
        assert s["title"] is not None


def test_customer_equipment_and_warranty_lookup():
    """Customer views installed serial hardware and warranty dates."""
    demo_cust_headers = {"Authorization": "Bearer customer_uid"}

    res = client.get("/api/customer/equipment", headers=demo_cust_headers)
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    if len(items) > 0:
        item = items[0]
        assert "serial_number" in item
        assert "product_name" in item
        assert "is_in_warranty" in item


def test_customer_ticket_creation():
    """Customer can raise a service ticket on equipment."""
    demo_cust_headers = {"Authorization": "Bearer customer_uid"}
    _ensure_demo_customer_enquiry()

    payload = {
        "subject": "Inverter Display Flashing Error Code E04",
        "description": "The inverter stopped feeding power to the grid at 11 AM.",
        "priority": "HIGH",
    }
    res = client.post("/api/customer/tickets", headers=demo_cust_headers, json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "ticket_number" in data
    assert data["ticket_number"].startswith("TCK-")


def test_government_schemes_and_subsidy_calculator():
    """Customer browses PM Surya Ghar schemes and calculates subsidy."""
    # 1. Browse schemes
    schemes_res = client.get("/api/customer/schemes")
    assert schemes_res.status_code == 200
    schemes = schemes_res.json()
    assert len(schemes) >= 1
    pm_scheme = next((s for s in schemes if "PM Surya Ghar" in s["name"]), None)
    assert pm_scheme is not None
    assert "pmsuryaghar.gov.in" in pm_scheme["official_link"]

    # 2. On-Grid 3 kW calculator (₹78,000 subsidy cap)
    calc_on_grid = client.post("/api/customer/schemes/estimate", json={
        "capacity_kw": 3.0,
        "system_type": "On-Grid",
        "monthly_bill": 3500.0,
        "state": "National",
    })
    assert calc_on_grid.status_code == 200
    res_on = calc_on_grid.json()
    assert res_on["central_subsidy"] == 78000.0
    # Gross cost is the catalogue price of the 3 kW On-Grid BOM template
    db = SessionLocal()
    from app.services.subsidy_service import package_price
    expected_gross = package_price(db, 3.0, "On-Grid")
    db.close()
    assert expected_gross > 0
    assert res_on["estimated_gross_cost"] == expected_gross
    assert res_on["estimated_net_cost"] == round(expected_gross - 78000.0, 2)
    assert res_on["is_eligible"] is True

    # 3. Off-Grid calculator (Ineligible for central subsidy)
    calc_off_grid = client.post("/api/customer/schemes/estimate", json={
        "capacity_kw": 3.0,
        "system_type": "Off-Grid",
        "monthly_bill": 3500.0,
    })
    assert calc_off_grid.status_code == 200
    res_off = calc_off_grid.json()
    assert res_off["central_subsidy"] == 0.0
    assert res_off["is_eligible"] is False
    assert "NOT eligible" in res_off["subsidy_breakdown"]


def test_customer_subsidy_tracker():
    """Customer tracks active government subsidy record."""
    demo_cust_headers = {"Authorization": "Bearer customer_uid"}

    res = client.get("/api/customer/subsidy", headers=demo_cust_headers)
    assert res.status_code == 200
    if res.json() is not None:
        sub = res.json()
        assert "status" in sub
        assert "eligible_amount" in sub



def test_enquiry_is_locked_after_submission():
    phone = f"97{uuid.uuid4().int % 10**8:08d}"
    email = f"lock_{uuid.uuid4().hex[:6]}@example.com"
    reg = register(client, {"email": email, "password": "lockpass1", "full_name": "Lock Test", "phone": phone})
    hdr = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    assert client.get("/api/customer/enquiry", headers=hdr).json() is None
    body = {"name": "Lock Test", "phone": phone, "email": email, "address": "5 Lock Street", "preferred_capacity_kw": 2}
    assert client.post("/api/customer/enquiry", json=body).status_code == 201
    mine = client.get("/api/customer/enquiry", headers=hdr).json()
    assert mine["address"] == "5 Lock Street" and mine["required_capacity"] == 2
    assert client.post("/api/customer/enquiry", json=body).status_code == 400
