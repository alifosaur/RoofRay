import uuid
import pytest
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.product import Product, ProductCategory
from app.models.bom import BOMTemplate, BOMLine
from app.models.lead import Lead, LeadStatus
from app.models.survey import Survey, SurveyStatus
from app.models.quote import Quote, QuoteStatus
from app.models.order import Order, OrderStatus
from app.models.serial import SerialItem, SerialStatus
from app.models.job import InstallationJob, JobStatus
from app.models.finance import SubsidyRecord, SubsidyStatus, TechnicianPayout

client = TestClient(app)


def test_complete_milestone_role_based_workflows_and_all_gates():
    uid_suffix = uuid.uuid4().hex[:8]
    db: Session = SessionLocal()

    # 1. SETUP FIXTURE USERS
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin_user:
        admin_user = User(
            email=f"admin_{uid_suffix}@sunpower.com",
            full_name="Rajesh Singhania (Admin)",
            role=UserRole.ADMIN,
            firebase_uid="admin_uid",
        )
        db.add(admin_user)

    sales_user = db.query(User).filter(User.role == UserRole.SALES).first()
    if not sales_user:
        sales_user = User(
            email=f"sales_{uid_suffix}@sunpower.com",
            full_name="Rohan Sharma (Sales)",
            role=UserRole.SALES,
            firebase_uid="sales_uid",
        )
        db.add(sales_user)

    tech1_user = db.query(User).filter(User.firebase_uid == "tech_uid_1").first()
    if not tech1_user:
        tech1_user = User(
            email=f"tech1_{uid_suffix}@sunpower.com",
            full_name="Amit Verma (Tech 1)",
            role=UserRole.TECHNICIAN,
            firebase_uid="tech_uid_1",
            hourly_rate=600,
        )
        db.add(tech1_user)

    tech2_user = db.query(User).filter(User.firebase_uid == "tech_uid_2").first()
    if not tech2_user:
        tech2_user = User(
            email=f"tech2_{uid_suffix}@sunpower.com",
            full_name="Sunil Yadav (Tech 2)",
            role=UserRole.TECHNICIAN,
            firebase_uid="tech_uid_2",
            hourly_rate=550,
        )
        db.add(tech2_user)

    wh_user = db.query(User).filter(User.role == UserRole.WAREHOUSE).first()
    if not wh_user:
        wh_user = User(
            email=f"wh_{uid_suffix}@sunpower.com",
            full_name="Deepak Kumar (Warehouse)",
            role=UserRole.WAREHOUSE,
            firebase_uid="warehouse_uid",
        )
        db.add(wh_user)

    # Products & BOM Template
    pnl = Product(
        sku=f"PNL-{uid_suffix}",
        name=f"SunPower Mono PERC 550W {uid_suffix}",
        category=ProductCategory.PANEL,
        is_serialised=False,
        warranty_years=25,
        cost_price=9000,
        sale_price=13500,
        stock_quantity=100,
    )
    inv = Product(
        sku=f"INV-{uid_suffix}",
        name=f"SolarEdge Inverter 3kW {uid_suffix}",
        category=ProductCategory.INVERTER,
        is_serialised=True,
        warranty_years=2,
        cost_price=24000,
        sale_price=34000,
        stock_quantity=20,
    )
    db.add_all([pnl, inv])
    db.commit()

    bom = BOMTemplate(
        name=f"3kW Premium Rooftop {uid_suffix}",
        capacity_kw=3.0,
        system_type="On-Grid",
        description="Standard 3 kW On-Grid package",
    )
    db.add(bom)
    db.commit()

    b_line1 = BOMLine(template_id=bom.id, product_id=pnl.id, quantity=6)
    b_line2 = BOMLine(template_id=bom.id, product_id=inv.id, quantity=1)
    db.add_all([b_line1, b_line2])
    db.commit()
    db.close()

    admin_headers = {"Authorization": "Bearer admin_uid"}
    sales_headers = {"Authorization": "Bearer sales_uid"}
    wh_headers = {"Authorization": "Bearer warehouse_uid"}
    tech1_headers = {"Authorization": "Bearer tech_uid_1"}
    tech2_headers = {"Authorization": "Bearer tech_uid_2"}

    # =========================================================================
    # A) CUSTOMER SELF-REGISTRATION & SECURITY ENFORCEMENT
    # =========================================================================
    cust_email = f"customer_{uid_suffix}@gmail.com"
    reg_res = client.post("/api/auth/register", json={
        "email": cust_email,
        "full_name": f"Pooja Mehta {uid_suffix}",
        "phone": f"+91 9811{uid_suffix[:6]}",
        "address": "Flat 302, Green Meadows",
        "city": "New Delhi",
        "pincode": "110025",
        "role": "admin",  # Escalation attempt: should be forcefully overridden to 'customer'
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["user"]["role"] == "customer"
    assert reg_data["user"]["customer_id"] is not None
    cust_token = reg_data["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # Verify GET /auth/me
    me_res = client.get("/api/auth/me", headers=cust_headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "customer"

    # =========================================================================
    # B) CUSTOMER PORTAL WORKFLOW (/customer)
    # =========================================================================
    # 1. Government Schemes & Subsidy estimator
    schemes_res = client.get("/api/customer/schemes", headers=cust_headers)
    assert schemes_res.status_code == 200
    assert len(schemes_res.json()) >= 1

    sub_est_res = client.post("/api/customer/schemes/estimate", headers=cust_headers, json={
        "system_type": "On-Grid",
        "capacity_kw": 3.0,
        "state": "Delhi",
    })
    assert sub_est_res.status_code == 200
    assert sub_est_res.json()["central_subsidy"] == 78000.0

    # 2. Submit solar enquiry form
    enq_res = client.post("/api/customer/enquiry", headers=cust_headers, json={
        "name": f"Pooja Mehta {uid_suffix}",
        "phone": f"+91 9811{uid_suffix[:6]}",
        "email": cust_email,
        "address": "Flat 302, Green Meadows",
        "city": "New Delhi",
        "state": "Delhi",
        "pincode": "110025",
        "property_type": "Residential",
        "roof_type": "Concrete / Flat",
        "roof_length_ft": 25.0,
        "roof_width_ft": 20.0,
        "shadow_free_area_sqft": 450.0,
        "floor_number": 2,
        "roof_direction": "South",
        "monthly_bill_amount": 4800.0,
        "preferred_system_type": "On-Grid",
        "preferred_capacity_kw": 3.0,
        "notes": "Looking for maximum PM Surya Ghar subsidy benefit",
    })
    assert enq_res.status_code == 201
    enq_data = enq_res.json()
    lead_id = enq_data["lead_id"]
    assert lead_id is not None
    assert "Our sales representative will contact you soon" in enq_data["message"]

    # 3. Tracker timeline verification
    track_res = client.get("/api/customer/tracker", headers=cust_headers)
    assert track_res.status_code == 200
    stages = track_res.json()["stages"]
    assert len(stages) == 13
    assert stages[0]["key"] == "enquiry"
    assert stages[0]["status"] in ["COMPLETED", "CURRENT"]

    # =========================================================================
    # C) SALES WORKFLOW (/sales)
    # =========================================================================
    # Sales lists leads
    leads_res = client.get("/api/leads", headers=sales_headers)
    assert leads_res.status_code == 200
    matched_leads = [l for l in leads_res.json() if l["id"] == lead_id]
    assert len(matched_leads) == 1
    assert matched_leads[0]["source"] == "customer_portal"

    # Sales records call checklist
    chk_res = client.post(f"/api/leads/{lead_id}/checklist", headers=sales_headers, json={
        "shadow_free_area_sqft": 450.0,
        "monthly_bill_amount": 4800.0,
        "grid_suitability": True,
        "notes": "Verified roof shadow-free zone, confirmed 3 kW system feasibility",
    })
    assert chk_res.status_code == 200
    assert chk_res.json()["status"] == "QUALIFIED"

    # Sales schedules site survey assigned to Tech 1
    srv_create_res = client.post("/api/surveys", headers=sales_headers, json={
        "lead_id": lead_id,
        "technician_id": tech1_user.id,
        "scheduled_date": datetime.utcnow().isoformat(),
        "notes": "Inspect main distribution board and terrace conduit route",
    })
    assert srv_create_res.status_code == 201
    survey_id = srv_create_res.json()["id"]

    # =========================================================================
    # D) TECHNICIAN PWA & ISOLATION (/technician)
    # =========================================================================
    # Tech 2 tries to access Tech 1's survey -> should be empty or not contain survey_id
    tech2_surveys = client.get("/api/surveys", headers=tech2_headers).json()
    assert all(s["id"] != survey_id for s in tech2_surveys)

    # Tech 1 accesses survey and completes report
    tech1_surveys = client.get("/api/surveys", headers=tech1_headers).json()
    assert any(s["id"] == survey_id for s in tech1_surveys)

    srv_complete_res = client.post(f"/api/surveys/{survey_id}/complete", headers=tech1_headers, json={
        "roof_direction": "South",
        "tilt_angle_deg": 28.0,
        "cable_distance_meters": 18.0,
        "feasibility_notes": "RCC terrace structurally sound; no shading from neighboring water tanks.",
    })
    assert srv_complete_res.status_code == 200

    # =========================================================================
    # GATE 1: QUOTATION CANNOT BE CREATED UNLESS SURVEY IS APPROVED
    # =========================================================================
    blocked_quote = client.post("/api/quotes", headers=sales_headers, json={
        "lead_id": lead_id,
        "template_id": bom.id,
    })
    assert blocked_quote.status_code == 400
    assert "APPROVED" in blocked_quote.json()["detail"].upper()

    # Manager / Admin approves survey
    appr_srv_res = client.post(f"/api/surveys/{survey_id}/approve", headers=admin_headers)
    assert appr_srv_res.status_code == 200
    assert appr_srv_res.json()["status"] == "APPROVED"

    # Now quotation creation succeeds with auto-exploded BOM
    quote_res = client.post("/api/quotes", headers=sales_headers, json={
        "lead_id": lead_id,
        "template_id": bom.id,
        "subsidy_amount": 78000.0,
    })
    assert quote_res.status_code == 201
    quote_data = quote_res.json()
    quote_id = quote_data["id"]
    assert len(quote_data["lines"]) >= 2
    assert quote_data["subsidy_amount"] == 78000.0

    # Customer accepts quotation
    acc_res = client.post(f"/api/customer/quotes/{quote_id}/accept", headers=cust_headers)
    assert acc_res.status_code == 200
    order_id = acc_res.json()["order_id"]

    # Order confirmed (advance payment recorded)
    conf_res = client.post(f"/api/orders/{order_id}/confirm", headers=sales_headers)
    assert conf_res.status_code == 200
    assert conf_res.json()["status"] == "CONFIRMED"

    # =========================================================================
    # E) WAREHOUSE SCANNING, GATES & DELIVERY AUTO-WARRANTY (/warehouse)
    # =========================================================================
    # Check queue
    wh_queue = client.get("/api/dispatch/queue", headers=wh_headers)
    assert wh_queue.status_code == 200
    assert any(o["id"] == order_id for o in wh_queue.json())

    # Advance stage to PACKING
    pack_res = client.put(f"/api/dispatch/orders/{order_id}/stage", headers=wh_headers, json={"stage": "PACKING"})
    assert pack_res.status_code == 200
    assert pack_res.json()["status"] == "PACKING"

    # GATE 2: Delivery/Dispatch CANNOT be confirmed before all required serialised items are scanned
    gate_dispatch_res = client.put(f"/api/dispatch/orders/{order_id}/stage", headers=wh_headers, json={"stage": "DISPATCHED"})
    assert gate_dispatch_res.status_code == 400
    assert "serial" in gate_dispatch_res.json()["detail"].lower()

    # Inward unique serial into warehouse stock
    unique_serial = f"SE-INV-{uid_suffix}"
    reg_serial_res = client.post("/api/dispatch/serials/register", headers=wh_headers, json={
        "product_id": inv.id,
        "serial_numbers": [unique_serial],
    })
    assert reg_serial_res.status_code == 201

    # Scan required inverter serial
    scan_res = client.post("/api/dispatch/scan", headers=wh_headers, json={
        "order_id": order_id,
        "serial_no": unique_serial,
    })
    assert scan_res.status_code == 200

    # Advance to DISPATCHED
    disp_res = client.put(f"/api/dispatch/orders/{order_id}/stage", headers=wh_headers, json={"stage": "DISPATCHED"})
    assert disp_res.status_code == 200
    assert disp_res.json()["status"] == "DISPATCHED"

    # Advance to OUT_FOR_DELIVERY
    out_res = client.put(f"/api/dispatch/orders/{order_id}/stage", headers=wh_headers, json={"stage": "OUT_FOR_DELIVERY"})
    assert out_res.status_code == 200

    # Advance to DELIVERED -> Triggers GATE 3: Auto-Warranty calculation
    deliv_res = client.put(f"/api/dispatch/orders/{order_id}/stage", headers=wh_headers, json={"stage": "DELIVERED"})
    assert deliv_res.status_code == 200
    assert deliv_res.json()["status"] == "DELIVERED"

    # Verify auto-warranty calculation (delivered_on = today, warranty_end = today + 2 years)
    lookup_res = client.get(f"/api/dispatch/lookup?serial_no={unique_serial}", headers=wh_headers)
    assert lookup_res.status_code == 200
    lookup_items = lookup_res.json()
    assert len(lookup_items) >= 1
    serial_info = lookup_items[0]
    assert serial_info["serial_no"] == unique_serial
    assert serial_info["in_warranty"] is True
    assert serial_info["delivered_on"] == date.today().isoformat()
    # Allow 1-2 leap day variations
    assert serial_info["warranty_end"][:4] == str(date.today().year + 2)

    # =========================================================================
    # F) TECHNICIAN INSTALLATION JOB & GENERATION VERIFICATION
    # =========================================================================
    # Find auto-created job for order
    jobs_res = client.get(f"/api/jobs?order_id={order_id}", headers=admin_headers)
    assert jobs_res.status_code == 200
    jobs = jobs_res.json()
    assert len(jobs) >= 1
    job_id = jobs[0]["id"]

    # Assign job to Tech 1
    client.put(f"/api/jobs/{job_id}", headers=admin_headers, json={"technician_id": tech1_user.id})

    # Tech 1 starts job
    start_res = client.post(f"/api/jobs/{job_id}/start", headers=tech1_headers)
    assert start_res.status_code == 200

    # Tech completes job with generation reading > 0 kW and signature
    comp_res = client.post(f"/api/jobs/{job_id}/complete", headers=tech1_headers, json={
        "confirmed_capacity_kw": 3.0,
        "generation_reading_kw": 2.85,
        "inverter_serial": unique_serial,
        "test_passed": True,
        "notes": "Grid synchronized successfully, export active at 2.85 kW peak",
        "customer_signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    })
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"

    # =========================================================================
    # G) ADMIN WORKFLOW: USER MGMT, COMMISSIONS, SUBSIDY & PAYOUTS (/admin)
    # =========================================================================
    # 1. User Management (Staff creation and editing)
    new_staff_res = client.post("/api/users", headers=admin_headers, json={
        "email": f"new_sales_{uid_suffix}@sunpower.com",
        "full_name": "Kavita Rao",
        "role": "sales",
        "firebase_uid": f"sales_kavita_{uid_suffix}",
        "phone": "+91 98330 11111",
        "hourly_rate": 0,
        "is_active": True,
    })
    assert new_staff_res.status_code == 201
    new_staff_id = new_staff_res.json()["id"]

    # Toggle user active status
    deact_res = client.put(f"/api/users/{new_staff_id}", headers=admin_headers, json={"is_active": False})
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # 2. Sales metrics & 2.5% commission reporting
    sales_rep_res = client.get("/api/reports/sales-metrics", headers=admin_headers)
    assert sales_rep_res.status_code == 200
    assert "commission_earned" in sales_rep_res.json()
    assert sales_rep_res.json()["commission_rate_pct"] == 2.5

    # 3. National Solar Subsidy tracking
    subs_list_res = client.get("/api/finance/subsidies", headers=admin_headers)
    assert subs_list_res.status_code == 200
    subs = [s for s in subs_list_res.json() if s["order_id"] == order_id]
    assert len(subs) == 1
    sub_id = subs[0]["id"]

    # Admin advances subsidy stages
    upd_sub_res = client.put(f"/api/finance/subsidies/{sub_id}", headers=admin_headers, json={
        "status": "DISCOM_FEASIBILITY_APPROVED",
        "application_no": f"MNRE-2026-{uid_suffix.upper()}",
        "sanctioned_amount": 78000.0,
    })
    assert upd_sub_res.status_code == 200
    assert upd_sub_res.json()["status"] == "DISCOM_FEASIBILITY_APPROVED"

    # Customer can view their updated subsidy in portal
    cust_sub_res = client.get("/api/customer/subsidy", headers=cust_headers)
    assert cust_sub_res.status_code == 200
    assert cust_sub_res.json()["status"] == "DISCOM_FEASIBILITY_APPROVED"

    # 4. Technician Payout approval & disbursement
    payouts_res = client.get("/api/finance/payouts", headers=admin_headers)
    assert payouts_res.status_code == 200
    job_payouts = [p for p in payouts_res.json() if p["job_id"] == job_id]
    assert len(job_payouts) == 1
    payout_id = job_payouts[0]["id"]

    pay_res = client.post(f"/api/finance/payouts/{payout_id}/pay", headers=admin_headers)
    assert pay_res.status_code == 200
    assert pay_res.json()["is_paid"] is True

    # =========================================================================
    # H) PRIVILEGE ESCALATION GUARDS VERIFICATION
    # =========================================================================
    # Customer cannot call staff/admin user management
    assert client.get("/api/users", headers=cust_headers).status_code == 403
    # Customer cannot scan warehouse barcodes
    assert client.post("/api/dispatch/scan", headers=cust_headers, json={"order_id": order_id, "serial_no": "X"}).status_code == 403
    # Technician cannot disburse finance payouts
    assert client.post(f"/api/finance/payouts/{payout_id}/pay", headers=tech1_headers).status_code == 403
