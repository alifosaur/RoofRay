import io
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
admin_headers = {"Authorization": "Bearer admin_uid"}
sales_headers = {"Authorization": "Bearer sales_uid"}
warehouse_headers = {"Authorization": "Bearer warehouse_uid"}
tech_headers = {"Authorization": "Bearer tech_uid"}


def test_installation_job_flow_and_timesheet():
    # Setup full chain: Lead -> Survey -> Quote -> Order -> Confirm -> Deliver
    lead = client.post("/api/leads/public", json={
        "name": "Kavita Singhal",
        "phone": "9922334455",
        "address": "Rohini Sector 9, Delhi",
        "required_capacity": 3.0,
    }).json()

    tech_id = client.get("/api/users?role=technician", headers=admin_headers).json()[0]["id"]
    survey = client.post("/api/surveys", headers=sales_headers, json={
        "lead_id": lead["id"],
        "technician_id": tech_id,
        "scheduled_date": datetime.utcnow().isoformat(),
    }).json()
    client.put(f"/api/surveys/{survey['id']}/complete", headers=tech_headers, json={
        "roof_direction": "South", "roof_tilt_deg": 22.0, "cable_distance_meters": 15.0
    })
    client.post(f"/api/surveys/{survey['id']}/approve", headers=sales_headers)

    templates = client.get("/api/bom-templates", headers=sales_headers).json()
    template_id = templates[0]["id"]
    quote = client.post("/api/quotes", headers=sales_headers, json={
        "lead_id": lead["id"],
        "template_id": template_id,
    }).json()

    order_id = client.post(f"/api/quotes/{quote['id']}/accept", headers=sales_headers).json()["order_id"]
    client.post(f"/api/orders/{order_id}/confirm", headers=sales_headers)

    # Packing/dispatch is covered in phase 5; jump the order to DELIVERED so installation can begin
    from app.core.database import SessionLocal
    from app.models.order import Order, OrderStatus
    db = SessionLocal()
    db.query(Order).filter(Order.id == order_id).update({"status": OrderStatus.DELIVERED})
    db.commit()
    db.close()

    # 1. Technician retrieves my-schedule
    schedule_res = client.get("/api/jobs/my-schedule", headers=tech_headers)
    assert schedule_res.status_code == 200
    my_jobs = schedule_res.json()
    job = next(j for j in my_jobs if j["order_id"] == order_id)
    assert job["status"] == "SCHEDULED"
    job_id = job["id"]

    # 2. Technician marks job started
    start_res = client.post(f"/api/jobs/{job_id}/start", headers=tech_headers)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "IN_PROGRESS"
    assert start_res.json()["started_at"] is not None

    # 3. Upload site photo
    dummy_image = io.BytesIO(b"fake image data")
    photo_res = client.post(
        f"/api/jobs/{job_id}/photos",
        headers=tech_headers,
        files={"file": ("inverter_mount.jpg", dummy_image, "image/jpeg")},
        data={"caption": "Growatt inverter mounted securely on wall"},
    )
    assert photo_res.status_code == 201
    assert "job_" in photo_res.json()["photo_url"]
    assert photo_res.json()["caption"] == "Growatt inverter mounted securely on wall"

    # 4. Technician completes installation
    finish_time = (datetime.utcnow() + timedelta(hours=3.5)).isoformat()
    complete_payload = {
        "confirmed_capacity_kw": 3.24,
        "power_generating": True,
        "customer_name": "Kavita Singhal",
        "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "finish_time": finish_time,
        "notes": "Grid connected, net-metering synchronization verified with 14.2A output.",
    }
    comp_res = client.post(f"/api/jobs/{job_id}/complete", headers=tech_headers, json=complete_payload)
    assert comp_res.status_code == 200
    completed_job = comp_res.json()
    assert completed_job["status"] == "COMPLETED"
    assert completed_job["power_generating"] is True
    assert completed_job["confirmed_capacity_kw"] == 3.24
    assert completed_job["signature"] is not None
    assert completed_job["signature"]["customer_name"] == "Kavita Singhal"

    # 5. AUTOMATED TIMESHEET CHECK:
    # Timesheet must be derived from start and finish timestamps
    ts = completed_job["timesheet"]
    assert ts is not None
    assert ts["hours"] >= 3.0
    assert ts["hourly_rate"] == 600.0  # Technician hourly rate
    assert ts["total_cost"] == round(ts["hours"] * 600.0, 2)

    # 6. Verify linked Order status transitioned to INSTALLED
    updated_order = client.get(f"/api/orders/{order_id}", headers=sales_headers).json()
    assert updated_order["status"] == "INSTALLED"
    assert updated_order["installed_at"] is not None

