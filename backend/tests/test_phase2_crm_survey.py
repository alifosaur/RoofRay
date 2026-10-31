import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

sales_headers = {"Authorization": "Bearer sales_uid"}
tech_headers = {"Authorization": "Bearer tech_uid"}
admin_headers = {"Authorization": "Bearer admin_uid"}


def test_public_lead_capture_and_assignment():
    payload = {
        "name": "Vikram Singh",
        "phone": "9988776655",
        "email": "vikram@example.com",
        "address": "42 Green Park, New Delhi",
        "required_capacity": 5.0,
        "system_type": "On-Grid",
        "notes": "Interested in rooftop subsidy",
    }
    response = client.post("/api/leads/public", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Vikram Singh"
    assert data["status"] == "NEW"
    assert data["assigned_to_id"] is not None
    assert data["is_deleted"] is False


def test_lead_soft_delete():
    # Create lead
    payload = {
        "name": "Anil Gupta",
        "phone": "9811223344",
        "address": "15 Model Town",
    }
    res = client.post("/api/leads/public", json=payload)
    lead_id = res.json()["id"]

    # Soft delete lead
    del_res = client.delete(f"/api/leads/{lead_id}", headers=sales_headers)
    assert del_res.status_code == 200
    assert del_res.json()["is_deleted"] is True

    # Assert excluded from default active list
    list_res = client.get("/api/leads", headers=sales_headers)
    active_ids = [l["id"] for l in list_res.json()]
    assert lead_id not in active_ids

    # Assert present when include_deleted=True
    all_res = client.get("/api/leads?include_deleted=true", headers=sales_headers)
    all_ids = [l["id"] for l in all_res.json()]
    assert lead_id in all_ids


def test_call_checklist_qualification():
    # Suitable case -> QUALIFIED
    lead_res = client.post("/api/leads/public", json={
        "name": "Meera Joshi",
        "phone": "9871122334",
        "address": "Plot 88, Sector 14, Gurgaon",
        "required_capacity": 3.0,
    })
    lead_id = lead_res.json()["id"]

    check_res = client.post(f"/api/leads/{lead_id}/checklist", headers=sales_headers, json={
        "shadow_free_area_sqft": 450.0,
        "monthly_bill_amount": 6500.0,
        "is_grid_suitable": True,
        "remarks": "RCC roof, excellent sunlight",
    })
    assert check_res.status_code == 200
    assert check_res.json()["status"] == "QUALIFIED"

    # Unsuitable case -> LOST
    unfit_res = client.post("/api/leads/public", json={
        "name": "Karan Malhotra",
        "phone": "9879988776",
        "address": "Old City, Delhi",
    })
    unfit_id = unfit_res.json()["id"]

    lost_res = client.post(f"/api/leads/{unfit_id}/checklist", headers=sales_headers, json={
        "shadow_free_area_sqft": 100.0,
        "monthly_bill_amount": 1500.0,
        "is_grid_suitable": False,
        "lost_reason": "Heavy shading from adjacent high-rise",
    })
    assert lost_res.status_code == 200
    assert lost_res.json()["status"] == "LOST"
    assert lost_res.json()["lost_reason"] == "Heavy shading from adjacent high-rise"


def test_survey_workflow():
    # 1. Create and qualify lead
    lead_res = client.post("/api/leads/public", json={
        "name": "Sunita Rao",
        "phone": "9899112233",
        "address": "B-12 Vasant Kunj",
        "required_capacity": 5.0,
    })
    lead_id = lead_res.json()["id"]

    client.post(f"/api/leads/{lead_id}/checklist", headers=sales_headers, json={
        "shadow_free_area_sqft": 600.0,
        "monthly_bill_amount": 9000.0,
        "is_grid_suitable": True,
    })

    # Get technician user ID
    users_res = client.get("/api/users?role=technician", headers=admin_headers)
    tech_id = users_res.json()[0]["id"]

    # 2. Schedule survey
    survey_date = (datetime.utcnow() + timedelta(days=2)).isoformat()
    sched_res = client.post("/api/surveys", headers=sales_headers, json={
        "lead_id": lead_id,
        "technician_id": tech_id,
        "scheduled_date": survey_date,
        "notes": "Verify inverter placement location",
    })
    assert sched_res.status_code == 201
    survey_id = sched_res.json()["id"]
    assert sched_res.json()["status"] == "SCHEDULED"

    # Verify lead status updated
    updated_lead = client.get(f"/api/leads/{lead_id}", headers=sales_headers).json()
    assert updated_lead["status"] == "SURVEY_SCHEDULED"

    # 3. Technician completes survey
    comp_res = client.put(f"/api/surveys/{survey_id}/complete", headers=tech_headers, json={
        "roof_direction": "South",
        "roof_tilt_deg": 22.5,
        "cable_distance_meters": 18.0,
        "notes": "Roof is in great condition. ACDB location confirmed.",
    })
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"

    # 4. Manager approves survey
    appr_res = client.post(f"/api/surveys/{survey_id}/approve", headers=sales_headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # Verify lead status updated to SURVEY_APPROVED
    lead_after_appr = client.get(f"/api/leads/{lead_id}", headers=sales_headers).json()
    assert lead_after_appr["status"] == "SURVEY_APPROVED"
