from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from tests.helpers import SALES, call_checklist, send_and_accept, confirm_with_advance, ship_to_delivered, scan_all_serials, advance

client = TestClient(app)
admin_headers = {"Authorization": "Bearer admin_uid"}
sales_headers = {"Authorization": "Bearer sales_uid"}
tech_headers = {"Authorization": "Bearer tech_uid"}


def test_order_invoice_payment_and_close_are_linked():
    lead = client.post("/api/leads/public", json={
        "name": "Linkage Test", "phone": "9811122233", "address": "Test Lane", "required_capacity": 3.0,
    }).json()
    tech_id = client.get("/api/users?role=technician", headers=admin_headers).json()[0]["id"]
    call_checklist(client, lead["id"], sales_headers)
    survey = client.post("/api/surveys", headers=sales_headers, json={
        "lead_id": lead["id"], "technician_id": tech_id, "scheduled_date": datetime.utcnow().isoformat(),
    }).json()
    client.put(f"/api/surveys/{survey['id']}/complete", headers=tech_headers, json={
        "roof_direction": "South", "roof_tilt_deg": 20, "cable_distance_meters": 12})
    client.post(f"/api/surveys/{survey['id']}/approve", headers=sales_headers)
    template_id = client.get("/api/bom-templates", headers=sales_headers).json()[0]["id"]
    quote = client.post("/api/quotes", headers=sales_headers, json={"lead_id": lead["id"], "template_id": template_id}).json()
    order_id = send_and_accept(client, quote['id'], sales_headers).json()["order_id"]

    # A second quote for the same lead must not spawn a duplicate order
    quote2 = client.post("/api/quotes", headers=sales_headers, json={"lead_id": lead["id"], "template_id": template_id}).json()
    assert send_and_accept(client, quote2['id'], sales_headers).status_code == 400

    # Confirming creates a sales invoice for accounting
    order = confirm_with_advance(client, order_id, sales_headers).json()
    invoices = client.get(f"/api/finance/invoices?order_id={order_id}", headers=admin_headers).json()
    assert len(invoices) == 1 and invoices[0]["invoice_type"] == "SALES" and invoices[0]["status"] == "ISSUED"
    assert invoices[0]["total_amount"] in (order["total_amount"], round(order["total_amount"] * 0.5, 2))

    # Overpayment is rejected
    over = client.post(f"/api/orders/{order_id}/payments", headers=sales_headers, json={
        "amount": order["total_amount"] + 1, "method": "UPI",
    })
    assert over.status_code == 400

    # The install job stays hidden from the technician until the warehouse delivers
    assert all(j["order_id"] != order_id for j in client.get("/api/jobs/my-schedule", headers=tech_headers).json())
    ship_to_delivered(client, order_id)
    job = next(j for j in client.get("/api/jobs/my-schedule", headers=tech_headers).json() if j["order_id"] == order_id)
    assert job["bom"] and job["delivered_serials"]

    # Completion needs a started job and at least one photo
    assert client.post(f"/api/jobs/{job['id']}/start", headers=tech_headers).status_code == 200
    complete_body = {"confirmed_capacity_kw": 3.0, "power_generating": True, "customer_name": "Linkage Test",
                     "signature_data": "data:image/png;base64,AAAA"}
    no_photo = client.post(f"/api/jobs/{job['id']}/complete", headers=tech_headers, json=complete_body)
    assert no_photo.status_code == 400 and "photo" in no_photo.json()["detail"]
    import io
    up = client.post(f"/api/jobs/{job['id']}/photos", headers=tech_headers,
                     files={"file": ("site.jpg", io.BytesIO(b"jpeg-bytes"), "image/jpeg")}, data={"caption": "Array"})
    assert up.status_code == 201, up.text
    done = client.post(f"/api/jobs/{job['id']}/complete", headers=tech_headers, json=complete_body)
    assert done.status_code == 200, done.text

    # Full payment after install closes the order and marks the invoice paid
    balance = round(order["total_amount"] - client.get(f"/api/orders/{order_id}", headers=admin_headers).json()["paid_amount"], 2)
    paid = client.post(f"/api/orders/{order_id}/payments", headers=sales_headers, json={"amount": balance, "method": "BANK"})
    assert paid.status_code in (200, 201), paid.text
    assert client.get(f"/api/orders/{order_id}", headers=admin_headers).json()["status"] == "CLOSED"
    assert client.get(f"/api/finance/invoices?order_id={order_id}", headers=admin_headers).json()[0]["status"] == "PAID"
