from datetime import date

from fastapi.testclient import TestClient

from app.main import app
from app.services.dispatch_service import add_years_to_date
from tests.helpers import ADMIN, WAREHOUSE, advance, confirmed_order, scan_all_serials

client = TestClient(app)


def _register(product_id, sns):
    assert client.post("/api/dispatch/serials/register", headers=WAREHOUSE, json={"product_id": product_id, "serial_numbers": sns}).status_code == 201


def test_scan_gate_strict_stages_and_auto_warranty():
    ctx = confirmed_order(client, "Dispatch Gate Customer")
    order_id = ctx["order_id"]

    # Delivery and packing are blocked before any serial is scanned
    assert "Missing required serialized items" in client.post(f"/api/dispatch/orders/{order_id}/deliver", headers=WAREHOUSE).json()["detail"]
    assert advance(client, order_id, "PACKED").status_code == 400
    # Stages cannot be skipped
    assert "Next stage" in advance(client, order_id, "DISPATCHED").json()["detail"]

    # First scan moves the order to PACKING and stamps the scan time
    serialised = [l for l in ctx["quote"]["lines"] if l["product"]["is_serialised"]]
    first = serialised[0]
    sn = f"GATE-{order_id}-A"
    _register(first["product_id"], [sn])
    scanned = client.post("/api/dispatch/scan", headers=WAREHOUSE, json={"order_id": order_id, "serial_no": sn})
    assert scanned.status_code == 200 and scanned.json()["scanned_at"] and scanned.json()["status"] == "ALLOCATED"
    assert client.get(f"/api/orders/{order_id}", headers=ADMIN).json()["status"] == "PACKING"

    # Same serial twice, or on another order, is rejected
    assert client.post("/api/dispatch/scan", headers=WAREHOUSE, json={"order_id": order_id, "serial_no": sn}).status_code == 400
    other = confirmed_order(client, "Other Customer")
    dup = client.post("/api/dispatch/scan", headers=WAREHOUSE, json={"order_id": other["order_id"], "serial_no": sn})
    assert dup.status_code == 400 and "already assigned" in dup.json()["detail"]
    # Unknown serials are rejected
    assert client.post("/api/dispatch/scan", headers=WAREHOUSE, json={"order_id": order_id, "serial_no": "NOPE-404"}).status_code == 404

    # Still blocked while anything serialised is missing
    if first["quantity"] > 1 or len(serialised) > 1:
        assert advance(client, order_id, "PACKED").status_code == 400

    # Scan the remaining units, then walk the stages in order
    remaining = first["quantity"] - 1
    if remaining:
        sns = [f"GATE-{order_id}-{i}" for i in range(remaining)]
        _register(first["product_id"], sns)
        for s in sns:
            assert client.post("/api/dispatch/scan", headers=WAREHOUSE, json={"order_id": order_id, "serial_no": s}).status_code == 200
    for line in serialised[1:]:
        sns = [f"GATE-{order_id}-{line['product_id']}-{i}" for i in range(line["quantity"])]
        _register(line["product_id"], sns)
        for s in sns:
            assert client.post("/api/dispatch/scan", headers=WAREHOUSE, json={"order_id": order_id, "serial_no": s}).status_code == 200

    stock_before = {p["id"]: p["stock_quantity"] for p in client.get("/api/inventory/stock", headers=WAREHOUSE).json()}
    assert advance(client, order_id, "PACKED").status_code == 200
    stock_after = {p["id"]: p["stock_quantity"] for p in client.get("/api/inventory/stock", headers=WAREHOUSE).json()}
    for line in ctx["quote"]["lines"]:
        if line["product"]["category"] != "service":
            assert stock_after[line["product_id"]] <= stock_before[line["product_id"]] - line["quantity"]

    assert client.post(f"/api/dispatch/orders/{order_id}/deliver", headers=WAREHOUSE).status_code == 400  # must be out for delivery
    for stage in ("DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"):
        res = advance(client, order_id, stage)
        assert res.status_code == 200, res.text

    # Warranty dates are computed on delivery, never typed
    serials = client.get(f"/api/dispatch/serials?order_id={order_id}", headers=WAREHOUSE).json()
    assert serials and all(s["status"] == "DELIVERED" for s in serials)
    for s in serials:
        assert s["delivered_on"] == date.today().isoformat()
        assert s["warranty_end"] == add_years_to_date(date.today(), s["product"]["warranty_years"]).isoformat()


def test_warranty_add_years_handles_leap_day():
    assert add_years_to_date(date(2024, 2, 29), 1) == date(2025, 2, 28)
    assert add_years_to_date(date(2026, 10, 31), 20) == date(2046, 10, 31)


def test_scan_all_links_registered_serials_then_placeholders():
    ctx = confirmed_order(client, "Scan All Customer")
    order_id = ctx["order_id"]
    serialised = [l for l in ctx["quote"]["lines"] if l["product"]["is_serialised"]]
    first = serialised[0]
    _register(first["product_id"], [f"REAL-{order_id}-1"])
    res = client.post(f"/api/dispatch/orders/{order_id}/scan-all", headers=WAREHOUSE)
    assert res.status_code == 200, res.text
    body = res.json()
    assert f"REAL-{order_id}-1" in body["linked_existing"]
    assert body["total"] == sum(l["quantity"] for l in serialised)
    assert all(sn.startswith("AUTO-") for sn in body["generated"])
    assert client.get(f"/api/orders/{order_id}", headers=ADMIN).json()["status"] == "PACKING"
    pick_id = client.get(f"/api/orders/{order_id}", headers=ADMIN).json()["pick_list_id"]
    pick = client.get(f"/api/inventory/pick-lists/{pick_id}", headers=WAREHOUSE).json()
    assert all(l["picked_qty"] == l["required_qty"] for l in pick["lines"] if l["product"]["category"] != "service")
    # Test DB is stocked, so nothing is short
    assert client.post(f"/api/inventory/pick-lists/{pick_id}/receive-shortfall", headers=WAREHOUSE).json()["received"] == []
    assert advance(client, order_id, "PACKED").status_code == 200  # scan gate satisfied
    assert client.post(f"/api/dispatch/orders/{order_id}/scan-all", headers=WAREHOUSE).status_code == 400
