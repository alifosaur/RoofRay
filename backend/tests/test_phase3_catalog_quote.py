import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
admin_headers = {"Authorization": "Bearer admin_uid"}
sales_headers = {"Authorization": "Bearer sales_uid"}
tech_headers = {"Authorization": "Bearer tech_uid"}


@pytest.fixture(scope="module")
def setup_catalog():
    import uuid
    run_id = uuid.uuid4().hex[:6].upper()
    # 1. Create products
    p_panel = client.post("/api/products", headers=admin_headers, json={
        "sku": f"PANEL-{run_id}",
        "name": "SunPower 540W Mono PERC Solar Panel",
        "category": "panel",
        "warranty_years": 20,
        "is_serialised": True,
        "cost_price": 10500.0,
        "sale_price": 14500.0,
        "stock_quantity": 50,
    }).json()

    p_inverter = client.post("/api/products", headers=admin_headers, json={
        "sku": f"INV-{run_id}",
        "name": "Growatt 3kW Single Phase On-Grid Inverter",
        "category": "inverter",
        "warranty_years": 2,
        "is_serialised": True,
        "cost_price": 24000.0,
        "sale_price": 32000.0,
        "stock_quantity": 10,
    }).json()

    p_bos = client.post("/api/products", headers=admin_headers, json={
        "sku": f"BOS-{run_id}",
        "name": "Complete 3kW ACDB/DCDB, Earthing & Structure Kit",
        "category": "balance_of_system",
        "warranty_years": 5,
        "is_serialised": False,
        "cost_price": 18000.0,
        "sale_price": 26000.0,
        "stock_quantity": 20,
    }).json()

    # 2. Create 3 kW On-Grid BOM Template
    template = client.post("/api/bom-templates", headers=admin_headers, json={
        "name": f"3 kW On-Grid System {run_id}",
        "capacity_kw": 3.0,
        "system_type": "On-Grid",
        "description": "Standard 3kW rooftop system with 6 panels and 3kW inverter",
        "lines": [
            {"product_id": p_panel["id"], "quantity": 6},
            {"product_id": p_inverter["id"], "quantity": 1},
            {"product_id": p_bos["id"], "quantity": 1},
        ],
    }).json()

    return {
        "panel": p_panel,
        "inverter": p_inverter,
        "bos": p_bos,
        "template": template,
    }


def test_quote_survey_approval_gate(setup_catalog):
    """
    CRITICAL GATE TEST:
    Quote creation MUST fail with HTTP 400 if survey is not approved.
    """
    # Create new lead (no survey yet)
    lead = client.post("/api/leads/public", json={
        "name": "Rajesh Khanna",
        "phone": "9810012345",
        "address": "D-4 South Ext, New Delhi",
        "required_capacity": 3.0,
    }).json()

    template = setup_catalog["template"]

    # Attempt quote creation without survey -> Expect 400
    res_no_survey = client.post("/api/quotes", headers=sales_headers, json={
        "lead_id": lead["id"],
        "template_id": template["id"],
    })
    assert res_no_survey.status_code == 400
    assert "Site survey must be APPROVED" in res_no_survey.json()["detail"]

    # Schedule survey (Status: SCHEDULED) -> Still Expect 400
    users_res = client.get("/api/users?role=technician", headers=admin_headers)
    tech_id = users_res.json()[0]["id"]
    survey = client.post("/api/surveys", headers=sales_headers, json={
        "lead_id": lead["id"],
        "technician_id": tech_id,
        "scheduled_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
    }).json()

    res_scheduled_survey = client.post("/api/quotes", headers=sales_headers, json={
        "lead_id": lead["id"],
        "template_id": template["id"],
    })
    assert res_scheduled_survey.status_code == 400
    assert "Site survey must be APPROVED" in res_scheduled_survey.json()["detail"]

    # Complete survey (Status: COMPLETED) -> Still Expect 400
    client.put(f"/api/surveys/{survey['id']}/complete", headers=tech_headers, json={
        "roof_direction": "South",
        "roof_tilt_deg": 20.0,
        "cable_distance_meters": 15.0,
    })
    res_completed_survey = client.post("/api/quotes", headers=sales_headers, json={
        "lead_id": lead["id"],
        "template_id": template["id"],
    })
    assert res_completed_survey.status_code == 400

    # Finally, APPROVE survey -> NOW Quote creation succeeds!
    appr_res = client.post(f"/api/surveys/{survey['id']}/approve", headers=sales_headers)
    assert appr_res.status_code == 200

    quote_res = client.post("/api/quotes", headers=sales_headers, json={
        "lead_id": lead["id"],
        "template_id": template["id"],
    })
    assert quote_res.status_code == 201
    quote = quote_res.json()
    assert quote["status"] == "DRAFT"
    assert quote["subtotal"] == (6 * 14500.0 + 1 * 32000.0 + 1 * 26000.0)  # 87000 + 32000 + 26000 = 145000
    assert quote["subsidy_amount"] == 78000.0  # 3kW subsidy
    assert len(quote["lines"]) == 3

    # Verify PDF download endpoint works
    pdf_res = client.get(f"/api/quotes/{quote['id']}/pdf", headers=sales_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

    # Test Quote Acceptance
    accept_res = client.post(f"/api/quotes/{quote['id']}/accept", headers=sales_headers)
    assert accept_res.status_code == 200
    data = accept_res.json()
    assert data["status"] == "DRAFT"
    assert "SO-" in data["order_number"]

    # Assert lead marked WON
    won_lead = client.get(f"/api/leads/{lead['id']}", headers=sales_headers).json()
    assert won_lead["status"] == "WON"
