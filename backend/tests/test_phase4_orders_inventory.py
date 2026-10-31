import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
admin_headers = {"Authorization": "Bearer admin_uid"}
sales_headers = {"Authorization": "Bearer sales_uid"}
warehouse_headers = {"Authorization": "Bearer warehouse_uid"}
accounts_headers = {"Authorization": "Bearer admin_uid"}
tech_headers = {"Authorization": "Bearer tech_uid"}


def test_inventory_purchase_and_stock():
    import uuid
    run_id = uuid.uuid4().hex[:6].upper()
    # 1. Create a product with 0 stock
    prod = client.post("/api/products", headers=admin_headers, json={
        "sku": f"CABLE-{run_id}",
        "name": "Solar DC Cable 4 sq mm (Red/Black)",
        "category": "balance_of_system",
        "warranty_years": 5,
        "is_serialised": False,
        "cost_price": 45.0,
        "sale_price": 75.0,
        "stock_quantity": 0,
        "min_stock_alert": 100,
    }).json()

    # Verify low stock
    low_res = client.get("/api/inventory/stock?low_stock_only=true", headers=warehouse_headers)
    assert any(p["id"] == prod["id"] for p in low_res.json())

    # Record purchase of 500 meters
    purchase_res = client.post("/api/inventory/purchases", headers=warehouse_headers, json={
        "product_id": prod["id"],
        "quantity": 500,
        "unit_cost": 45.0,
        "reference": "PO-2026-001",
    })
    assert purchase_res.status_code == 201
    assert purchase_res.json()["quantity"] == 500

    # Verify stock updated
    updated_prod = client.get(f"/api/products/{prod['id']}", headers=warehouse_headers).json()
    assert updated_prod["stock_quantity"] == 500


def test_order_confirmation_automation_and_payment():
    # Setup: Create lead, approve survey, create quote, accept quote to get DRAFT order
    lead = client.post("/api/leads/public", json={
        "name": "Manish Malhotra",
        "phone": "9812345678",
        "address": "GK-1, New Delhi",
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
        "roof_tilt_deg": 25.0,
        "cable_distance_meters": 20.0,
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

    # 1. Confirm Order
    confirm_res = client.post(f"/api/orders/{order_id}/confirm", headers=sales_headers)
    assert confirm_res.status_code == 200
    order_data = confirm_res.json()
    assert order_data["status"] == "CONFIRMED"
    assert order_data["confirmed_at"] is not None

    # Verify pick list was auto-generated
    pick_lists = client.get("/api/inventory/pick-lists", headers=warehouse_headers).json()
    matching_pick = next((p for p in pick_lists if p["order_id"] == order_id), None)
    assert matching_pick is not None
    assert matching_pick["status"] == "PENDING"
    assert len(matching_pick["lines"]) > 0

    # 2. Record Payment
    pay_res = client.post(f"/api/orders/{order_id}/payments", headers=accounts_headers, json={
        "amount": 50000.0,
        "method": "UPI",
        "transaction_ref": "UPI/2026/987654321",
    })
    assert pay_res.status_code == 201
    assert pay_res.json()["amount"] == 50000.0

    # Verify order paid_amount updated
    order_after_pay = client.get(f"/api/orders/{order_id}", headers=sales_headers).json()
    assert order_after_pay["paid_amount"] == 50000.0

    # 3. Warehouse Packs Pick List
    pack_res = client.put(f"/api/inventory/pick-lists/{matching_pick['id']}/pack", headers=warehouse_headers)
    assert pack_res.status_code == 200
    assert pack_res.json()["status"] == "PACKED"

    # Verify order status transitioned to PACKED
    order_after_pack = client.get(f"/api/orders/{order_id}", headers=sales_headers).json()
    assert order_after_pack["status"] == "PACKED"
