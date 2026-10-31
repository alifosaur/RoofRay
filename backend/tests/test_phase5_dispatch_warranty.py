import pytest
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
admin_headers = {"Authorization": "Bearer admin_uid"}
sales_headers = {"Authorization": "Bearer sales_uid"}
warehouse_headers = {"Authorization": "Bearer warehouse_uid"}
tech_headers = {"Authorization": "Bearer tech_uid"}


def test_dispatch_gate_and_auto_warranty():
    # 1. Setup: Create lead, approve survey, quote and confirm order
    lead = client.post("/api/leads/public", json={
        "name": "Arjun Kapoor",
        "phone": "9911223344",
        "address": "Sector 50, Noida",
        "required_capacity": 3.0,
    }).json()

    tech_id = client.get("/api/users?role=technician", headers=admin_headers).json()[0]["id"]
    survey = client.post("/api/surveys", headers=sales_headers, json={
        "lead_id": lead["id"],
        "technician_id": tech_id,
        "scheduled_date": datetime.utcnow().isoformat(),
    }).json()

    client.put(f"/api/surveys/{survey['id']}/complete", headers=tech_headers, json={
        "roof_direction": "South",
        "roof_tilt_deg": 22.0,
        "cable_distance_meters": 15.0,
    })
    client.post(f"/api/surveys/{survey['id']}/approve", headers=sales_headers)

    templates = client.get("/api/bom-templates", headers=sales_headers).json()
    template_id = templates[0]["id"]

    quote = client.post("/api/quotes", headers=sales_headers, json={
        "lead_id": lead["id"],
        "template_id": template_id,
    }).json()

    accept_res = client.post(f"/api/quotes/{quote['id']}/accept", headers=sales_headers)
    order_id = accept_res.json()["order_id"]

    client.post(f"/api/orders/{order_id}/confirm", headers=sales_headers)

    # 2. DISPATCH GATE CHECK:
    # Attempt to confirm delivery without scanning required serials -> MUST fail with 400!
    unscanned_deliv = client.post(f"/api/dispatch/orders/{order_id}/deliver", headers=warehouse_headers)
    assert unscanned_deliv.status_code == 400
    assert "Missing required serialized items" in unscanned_deliv.json()["detail"]

    # 3. Register serials in inventory
    # Find inverter and panel product IDs from quote lines
    inverter_line = next(l for l in quote["lines"] if l["product"]["category"] == "inverter")
    panel_line = next(l for l in quote["lines"] if l["product"]["category"] == "panel")

    inv_prod_id = inverter_line["product_id"]
    panel_prod_id = panel_line["product_id"]
    panel_qty = panel_line["quantity"]

    import uuid
    test_run_id = uuid.uuid4().hex[:6].upper()
    inv_serial = f"INV-GRW-{test_run_id}-001"
    panel_serials = [f"PNL-SP540-{test_run_id}-{i:04d}" for i in range(1, panel_qty + 1)]

    client.post("/api/dispatch/serials/register", headers=warehouse_headers, json={
        "product_id": inv_prod_id,
        "serial_numbers": [inv_serial],
    })
    client.post("/api/dispatch/serials/register", headers=warehouse_headers, json={
        "product_id": panel_prod_id,
        "serial_numbers": panel_serials,
    })

    # 4. Scan only inverter -> delivery still fails (missing panels)
    client.post("/api/dispatch/scan", headers=warehouse_headers, json={
        "order_id": order_id,
        "serial_no": inv_serial,
    })
    partial_deliv = client.post(f"/api/dispatch/orders/{order_id}/deliver", headers=warehouse_headers)
    assert partial_deliv.status_code == 400
    assert panel_line["product"]["name"] in partial_deliv.json()["detail"]

    # 5. Scan all 6 panels
    for p_serial in panel_serials:
        scan_res = client.post("/api/dispatch/scan", headers=warehouse_headers, json={
            "order_id": order_id,
            "serial_no": p_serial,
        })
        if scan_res.status_code != 200:
            print("DEBUG SCAN FAILED:", scan_res.status_code, scan_res.json())
        assert scan_res.status_code == 200

    # 6. Verify duplicate scan of assigned serial to another order fails
    # Create a second lead and order
    lead2 = client.post("/api/leads/public", json={
        "name": "Second Customer",
        "phone": "9911991199",
        "address": "Delhi",
    }).json()
    survey2 = client.post("/api/surveys", headers=sales_headers, json={
        "lead_id": lead2["id"],
        "technician_id": tech_id,
        "scheduled_date": datetime.utcnow().isoformat(),
    }).json()
    client.put(f"/api/surveys/{survey2['id']}/complete", headers=tech_headers, json={
        "roof_direction": "South", "roof_tilt_deg": 20.0, "cable_distance_meters": 10.0
    })
    client.post(f"/api/surveys/{survey2['id']}/approve", headers=sales_headers)
    q2 = client.post("/api/quotes", headers=sales_headers, json={"lead_id": lead2["id"], "template_id": template_id}).json()
    order2 = client.post(f"/api/quotes/{q2['id']}/accept", headers=sales_headers).json()

    duplicate_res = client.post("/api/dispatch/scan", headers=warehouse_headers, json={
        "order_id": order2["order_id"],
        "serial_no": inv_serial,
    })
    assert duplicate_res.status_code == 400
    assert "already assigned" in duplicate_res.json()["detail"]

    # 7. Confirm delivery -> NOW Succeeded!
    deliv_success = client.post(f"/api/dispatch/orders/{order_id}/deliver", headers=warehouse_headers)
    assert deliv_success.status_code == 200
    order_data = deliv_success.json()
    assert order_data["status"] == "DELIVERED"
    assert order_data["delivered_at"] is not None

    # 8. AUTOMATED WARRANTY CHECK:
    # Check that delivered_on = today and warranty_end calculated automatically
    today = date.today()
    serials_res = client.get(f"/api/dispatch/serials?order_id={order_id}", headers=warehouse_headers)
    serials = serials_res.json()
    assert len(serials) == 1 + panel_qty

    inv_item = next(s for s in serials if s["serial_no"] == inv_serial)
    assert inv_item["status"] == "DELIVERED"
    assert inv_item["delivered_on"] == today.isoformat()
    # Inverter has 2 years warranty
    assert inv_item["warranty_end"] == today.replace(year=today.year + 2).isoformat()

    pnl_item = next(s for s in serials if s["serial_no"] == panel_serials[0])
    assert pnl_item["status"] == "DELIVERED"
    assert pnl_item["delivered_on"] == today.isoformat()
    # Panel has 20 years warranty
    assert pnl_item["warranty_end"] == today.replace(year=today.year + 20).isoformat()
