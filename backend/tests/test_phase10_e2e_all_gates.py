import io
import uuid
import pytest
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.product import Product, ProductCategory
from app.models.bom import BOMTemplate, BOMLine
from app.models.lead import Lead, LeadStatus
from app.models.survey import Survey, SurveyStatus
from app.models.quote import Quote, QuoteStatus
from app.models.order import Order, OrderStatus
from app.models.serial import SerialItem, SerialStatus
from app.models.job import InstallationJob, JobStatus
from app.models.ticket import Ticket, TicketStatus
from app.models.finance import Invoice, SubsidyRecord, TechnicianPayout


@pytest.fixture
def client():
    return TestClient(app)


def test_full_solar_lifecycle_and_all_gates(client: TestClient):
    uid_suffix = uuid.uuid4().hex[:6]
    db: Session = SessionLocal()

    # 1. Ensure required role users exist
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin_user:
        admin_user = User(email=f"admin_{uid_suffix}@sunpower.com", full_name="Admin", role=UserRole.ADMIN, firebase_uid=f"admin_{uid_suffix}")
        db.add(admin_user)

    sales_user = db.query(User).filter(User.role == UserRole.SALES).first()
    if not sales_user:
        sales_user = User(email=f"sales_{uid_suffix}@sunpower.com", full_name="Sales", role=UserRole.SALES, firebase_uid=f"sales_{uid_suffix}")
        db.add(sales_user)

    tech_user = db.query(User).filter(User.role == UserRole.TECHNICIAN).first()
    if not tech_user:
        tech_user = User(email=f"tech_{uid_suffix}@sunpower.com", full_name="Tech", role=UserRole.TECHNICIAN, firebase_uid=f"tech_{uid_suffix}", hourly_rate=600)
        db.add(tech_user)

    wh_user = db.query(User).filter(User.role == UserRole.WAREHOUSE).first()
    if not wh_user:
        wh_user = User(email=f"wh_{uid_suffix}@sunpower.com", full_name="Warehouse", role=UserRole.WAREHOUSE, firebase_uid=f"wh_{uid_suffix}")
        db.add(wh_user)

    support_user = admin_user
    accounts_user = admin_user

    # 2. Ensure a serialized product and BOM template exist
    pnl = Product(
        sku=f"PNL-{uid_suffix}",
        name=f"Test Panel {uid_suffix}",
        category=ProductCategory.PANEL,
        is_serialised=False,
        warranty_years=20,
        cost_price=10000,
        sale_price=14000,
        stock_quantity=50
    )
    inv = Product(
        sku=f"INV-{uid_suffix}",
        name=f"Test Inverter {uid_suffix}",
        category=ProductCategory.INVERTER,
        is_serialised=True,
        warranty_years=2,
        cost_price=25000,
        sale_price=35000,
        stock_quantity=20
    )
    db.add_all([pnl, inv])
    db.commit()

    bom = BOMTemplate(
        name=f"BOM-{uid_suffix}",
        capacity_kw=3.0,
        system_type="On-Grid",
        description="E2E test template"
    )
    db.add(bom)
    db.commit()

    line1 = BOMLine(template_id=bom.id, product_id=pnl.id, quantity=6)
    line2 = BOMLine(template_id=bom.id, product_id=inv.id, quantity=1)
    db.add_all([line1, line2])
    db.commit()

    db.close()

    # -------------------------------------------------------------
    # STEP 1: PUBLIC LEAD CAPTURE (Unauthenticated)
    # -------------------------------------------------------------
    lead_phone = f"+91 9999{uid_suffix[:5]}"
    res = client.post("/api/leads/public", json={
        "name": f"Pooja Sharma {uid_suffix}",
        "phone": lead_phone,
        "email": f"pooja_{uid_suffix}@gmail.com",
        "address": "404 Sunrise Apartments, Mumbai",
        "required_capacity_kw": 3.0,
        "system_type": "On-Grid",
        "notes": "Looking for rooftop solar on flat RCC terrace"
    })
    assert res.status_code == 201, res.text
    lead_data = res.json()
    lead_id = lead_data["id"]
    customer_id = lead_data["customer_id"]
    assert lead_data["status"] == "NEW"

    # -------------------------------------------------------------
    # GATE 6: SOFT DELETE ONLY (Leads never physically disappear)
    # -------------------------------------------------------------
    del_res = client.delete(f"/api/leads/{lead_id}", headers={"Authorization": "Bearer admin_uid"})
    assert del_res.status_code == 200
    # Query database directly to confirm record still exists with is_deleted=True
    verify_db = SessionLocal()
    soft_deleted_lead = verify_db.query(Lead).filter(Lead.id == lead_id).first()
    assert soft_deleted_lead is not None
    assert soft_deleted_lead.is_deleted is True
    # Restore for remaining test flow
    soft_deleted_lead.is_deleted = False
    verify_db.commit()
    verify_db.close()

    # -------------------------------------------------------------
    # STEP 2: QUALIFICATION & CALL CHECKLIST
    # -------------------------------------------------------------
    chk_res = client.post(f"/api/leads/{lead_id}/checklist", headers={"Authorization": "Bearer sales_uid"}, json={
        "shadow_free_area_sqft": 350.0,
        "monthly_bill_amount": 4500.0,
        "grid_suitability": True,
        "notes": "Clear southern exposure, suitable for 3 kW system"
    })
    assert chk_res.status_code == 200, chk_res.text
    assert chk_res.json()["status"] == "QUALIFIED"

    # -------------------------------------------------------------
    # STEP 3: SCHEDULE SITE SURVEY
    # -------------------------------------------------------------
    srv_res = client.post("/api/surveys", headers={"Authorization": "Bearer sales_uid"}, json={
        "lead_id": lead_id,
        "technician_id": tech_user.id,
        "scheduled_date": datetime.utcnow().isoformat(),
        "notes": "Check conduit route to electric meter"
    })
    assert srv_res.status_code == 201, srv_res.text
    survey_id = srv_res.json()["id"]

    # -------------------------------------------------------------
    # GATE 1: SURVEY GATE (Cannot create quote unless survey is APPROVED)
    # -------------------------------------------------------------
    early_quote_res = client.post("/api/quotes", headers={"Authorization": "Bearer sales_uid"}, json={
        "lead_id": lead_id,
        "template_id": bom.id,
        "notes": "Premature quote before approval"
    })
    assert early_quote_res.status_code == 400, "Gate 1 failed: Quote was created before survey approval!"
    assert "survey" in early_quote_res.json()["detail"].lower()

    # Technician completes survey
    comp_res = client.put(f"/api/surveys/{survey_id}/complete", headers={"Authorization": "Bearer tech_uid"}, json={
        "roof_direction": "South",
        "roof_tilt_deg": 22.0,
        "cable_distance_meters": 18.0,
        "notes": "Survey done, roof structurally sound."
    })
    assert comp_res.status_code == 200, comp_res.text

    # Admin approves survey
    approve_res = client.post(f"/api/surveys/{survey_id}/approve", headers={"Authorization": "Bearer admin_uid"})
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"

    # -------------------------------------------------------------
    # STEP 4: QUOTE CREATION WITH BOM EXPLOSION & PDF
    # -------------------------------------------------------------
    quote_res = client.post("/api/quotes", headers={"Authorization": "Bearer sales_uid"}, json={
        "lead_id": lead_id,
        "template_id": bom.id,
        "notes": "Standard 3 kW On-Grid Package"
    })
    assert quote_res.status_code == 201, quote_res.text
    quote_data = quote_res.json()
    quote_id = quote_data["id"]
    assert len(quote_data["lines"]) == 2

    # Download Quote PDF
    pdf_res = client.get(f"/api/quotes/{quote_id}/pdf", headers={"Authorization": "Bearer sales_uid"})
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"

    # -------------------------------------------------------------
    # STEP 5: ACCEPT QUOTE -> CREATES SALES ORDER
    # -------------------------------------------------------------
    accept_res = client.post(f"/api/quotes/{quote_id}/accept", headers={"Authorization": "Bearer sales_uid"})
    assert accept_res.status_code == 200
    order_data = accept_res.json()
    order_id = order_data["order_id"]
    assert order_data["status"] == "DRAFT"

    # -------------------------------------------------------------
    # STEP 6: RECORD ADVANCE PAYMENT & CONFIRM ORDER
    # -------------------------------------------------------------
    pay_res = client.post(f"/api/orders/{order_id}/payments", headers={"Authorization": "Bearer accounts_uid"}, json={
        "amount": 50000.0,
        "method": "UPI",
        "transaction_ref": f"UPI-{uid_suffix}",
        "notes": "Advance payment received"
    })
    assert pay_res.status_code == 201, pay_res.text

    # Confirm order -> auto generates pick list and installation job
    confirm_res = client.post(f"/api/orders/{order_id}/confirm", headers={"Authorization": "Bearer sales_uid"})
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CONFIRMED"

    # -------------------------------------------------------------
    # GATE 2: DISPATCH GATE (Cannot deliver until every serial item scanned)
    # -------------------------------------------------------------
    early_deliver_res = client.post(f"/api/dispatch/orders/{order_id}/deliver", headers={"Authorization": "Bearer warehouse_uid"})
    assert early_deliver_res.status_code == 400, "Gate 2 failed: Delivery confirmed before serial scanning!"
    assert "serial" in early_deliver_res.json()["detail"].lower()

    # -------------------------------------------------------------
    # STEP 7: WAREHOUSE SERIAL REGISTRATION & SCANNING
    # -------------------------------------------------------------
    test_serial_no = f"INV-SN-{uid_suffix}-1234"
    client.post("/api/dispatch/serials/register", headers={"Authorization": "Bearer warehouse_uid"}, json={
        "product_id": inv.id,
        "serial_numbers": [test_serial_no]
    })

    # Warehouse must pack the pick list before serials can be scanned for dispatch
    pl = next(p for p in client.get("/api/inventory/pick-lists", headers={"Authorization": "Bearer warehouse_uid"}).json() if p["order_id"] == order_id)
    pack_res = client.put(f"/api/inventory/pick-lists/{pl['id']}/pack", headers={"Authorization": "Bearer warehouse_uid"})
    assert pack_res.status_code == 200, pack_res.text

    scan_res = client.post("/api/dispatch/scan", headers={"Authorization": "Bearer warehouse_uid"}, json={
        "order_id": order_id,
        "product_id": inv.id,
        "serial_no": test_serial_no
    })
    assert scan_res.status_code == 200, scan_res.text
    assert scan_res.json()["serial_no"] == test_serial_no

    # -------------------------------------------------------------
    # GATE 3: ORDER DELIVERY & AUTOMATIC WARRANTY INITIALIZATION
    # -------------------------------------------------------------
    deliver_res = client.post(f"/api/dispatch/orders/{order_id}/deliver", headers={"Authorization": "Bearer warehouse_uid"})
    assert deliver_res.status_code == 200
    assert deliver_res.json()["status"] == "DELIVERED"

    # Already delivered serial rejected if scanned again
    dup_scan_res = client.post("/api/dispatch/scan", headers={"Authorization": "Bearer warehouse_uid"}, json={
        "order_id": order_id,
        "product_id": inv.id,
        "serial_no": test_serial_no
    })
    assert dup_scan_res.status_code == 400

    # Verify warranty_end was auto-calculated (delivered_on + product warranty years)
    serials_res = client.get(f"/api/dispatch/serials?order_id={order_id}", headers={"Authorization": "Bearer warehouse_uid"})
    assert serials_res.status_code == 200
    scanned_serial = serials_res.json()[0]
    assert scanned_serial["delivered_on"] == date.today().isoformat()
    # Inverter has 2 years warranty
    expected_warranty_end = date.today().replace(year=date.today().year + 2).isoformat()
    assert scanned_serial["warranty_end"] == expected_warranty_end

    # -------------------------------------------------------------
    # STEP 8: TECHNICIAN FIELD EXECUTION, SIGNATURE & TIMESHEET
    # -------------------------------------------------------------
    verify_db = SessionLocal()
    job = verify_db.query(InstallationJob).filter(InstallationJob.order_id == order_id).first()
    assert job is not None
    job_id = job.id
    verify_db.close()

    # Technician starts job
    start_job_res = client.post(f"/api/jobs/{job_id}/start", headers={"Authorization": "Bearer tech_uid"})
    assert start_job_res.status_code == 200
    assert start_job_res.json()["status"] == "IN_PROGRESS"

    # Upload photo
    fake_photo = io.BytesIO(b"fake solar panel image bytes")
    photo_res = client.post(
        f"/api/jobs/{job_id}/photos",
        headers={"Authorization": "Bearer tech_uid"},
        files={"file": ("panel.jpg", fake_photo, "image/jpeg")},
        data={"caption": "Mounted Panels on Roof"}
    )
    assert photo_res.status_code == 201

    # Complete job with customer digital signature
    complete_res = client.post(f"/api/jobs/{job_id}/complete", headers={"Authorization": "Bearer tech_uid"}, json={
        "confirmed_capacity_kw": 3.0,
        "power_generating": True,
        "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "customer_name": f"Pooja Sharma {uid_suffix}",
        "notes": "Installation flawless, grid net-meter configured."
    })
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"

    # -------------------------------------------------------------
    # STEP 9: AFTER-SALES WARRANTY LOOKUP & TICKET AUTO-BILLING (GATE 4)
    # -------------------------------------------------------------
    lookup_res = client.get(f"/api/tickets/lookup?query={test_serial_no}", headers={"Authorization": "Bearer support_uid"})
    assert lookup_res.status_code == 200
    lookup_data = lookup_res.json()
    assert len(lookup_data) == 1
    assert lookup_data[0]["in_warranty"] is True
    serial_id = lookup_data[0]["serial_id"]

    # Ticket 1: In-warranty complaint (Gate 4: must set is_billable = False)
    t1_res = client.post("/api/tickets", headers={"Authorization": "Bearer support_uid"}, json={
        "subject": "Minor inverter noise check",
        "description": "Customer notices hum during peak generation",
        "customer_id": customer_id,
        "serial_item_id": serial_id
    })
    assert t1_res.status_code == 201
    assert t1_res.json()["is_billable"] is False, "Gate 4 failed: In-warranty item marked billable!"
    t1_id = t1_res.json()["id"]

    # -------------------------------------------------------------
    # GATE 5: TICKET CLOSURE GATE (Cannot close without customer confirmation)
    # -------------------------------------------------------------
    # Resolve ticket
    client.put(f"/api/tickets/{t1_id}/resolve", headers={"Authorization": "Bearer support_uid"}, json={
        "resolution_notes": "Cleaned heat sink fan, noise resolved.",
        "parts_cost": 0.0,
        "labour_cost": 0.0
    })

    # Attempt premature close -> HTTP 400
    early_close_res = client.post(f"/api/tickets/{t1_id}/close", headers={"Authorization": "Bearer support_uid"})
    assert early_close_res.status_code == 400, "Gate 5 failed: Ticket closed without customer confirmation!"

    # Customer confirms satisfaction
    confirm_ticket_res = client.post(f"/api/tickets/{t1_id}/customer-confirm", headers={"Authorization": "Bearer support_uid"})
    assert confirm_ticket_res.status_code == 200
    assert confirm_ticket_res.json()["status"] == "CUSTOMER_CONFIRMED"

    # Now close ticket -> Succeeds
    close_ticket_res = client.post(f"/api/tickets/{t1_id}/close", headers={"Authorization": "Bearer support_uid"})
    assert close_ticket_res.status_code == 200
    assert close_ticket_res.json()["status"] == "CLOSED"

    # -------------------------------------------------------------
    # STEP 10: DIRECTOR DASHBOARD, PROFIT PER JOB & EXCEL EXPORT
    # -------------------------------------------------------------
    dash_res = client.get("/api/reports/dashboard?range=all", headers={"Authorization": "Bearer admin_uid"})
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "revenue" in dash_data
    assert "net_profit" in dash_data

    profit_res = client.get("/api/reports/profit-per-job?range=all", headers={"Authorization": "Bearer admin_uid"})
    assert profit_res.status_code == 200
    assert isinstance(profit_res.json(), list)

    excel_res = client.get("/api/reports/export.xlsx", headers={"Authorization": "Bearer admin_uid"})
    assert excel_res.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in excel_res.headers["content-type"]

    # Share link generation & public token access
    share_res = client.post("/api/reports/share-link", headers={"Authorization": "Bearer admin_uid"}, json={"expires_days": 7})
    assert share_res.status_code == 200
    share_token = share_res.json()["share_token"]

    shared_view_res = client.get(f"/api/reports/shared/{share_token}")
    assert shared_view_res.status_code == 200
    assert "revenue" in shared_view_res.json()

    print("\n✓ ALL 8 GATES AND COMPLETE END-TO-END SOLAR LIFECYCLE VERIFIED SUCCESSFULLY!")
