from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.order import Order, OrderStatus

client = TestClient(app)
admin_headers = {"Authorization": "Bearer admin_uid"}
sales_headers = {"Authorization": "Bearer sales_uid"}
tech_headers = {"Authorization": "Bearer tech_uid"}


def test_order_invoice_payment_and_close_are_linked():
    lead = client.post("/api/leads/public", json={
        "name": "Linkage Test", "phone": "9811122233", "address": "Test Lane", "required_capacity": 3.0,
    }).json()
    tech_id = client.get("/api/users?role=technician", headers=admin_headers).json()[0]["id"]
    survey = client.post("/api/surveys", headers=sales_headers, json={
        "lead_id": lead["id"], "technician_id": tech_id, "scheduled_date": datetime.utcnow().isoformat(),
    }).json()
    client.post(f"/api/surveys/{survey['id']}/approve", headers=sales_headers)
    template_id = client.get("/api/bom-templates", headers=sales_headers).json()[0]["id"]
    quote = client.post("/api/quotes", headers=sales_headers, json={"lead_id": lead["id"], "template_id": template_id}).json()
    order_id = client.post(f"/api/quotes/{quote['id']}/accept", headers=sales_headers).json()["order_id"]

    # A second quote for the same lead must not spawn a duplicate order
    quote2 = client.post("/api/quotes", headers=sales_headers, json={"lead_id": lead["id"], "template_id": template_id}).json()
    assert client.post(f"/api/quotes/{quote2['id']}/accept", headers=sales_headers).status_code == 400

    # Confirming creates a sales invoice for accounting
    order = client.post(f"/api/orders/{order_id}/confirm", headers=sales_headers).json()
    invoices = client.get(f"/api/finance/invoices?order_id={order_id}", headers=admin_headers).json()
    assert len(invoices) == 1 and invoices[0]["invoice_type"] == "SALES" and invoices[0]["status"] == "ISSUED"
    assert invoices[0]["total_amount"] == order["total_amount"]

    # Overpayment is rejected
    over = client.post(f"/api/orders/{order_id}/payments", headers=sales_headers, json={
        "amount": order["total_amount"] + 1, "method": "UPI",
    })
    assert over.status_code == 400

    # Installation cannot start before delivery
    job = next(j for j in client.get("/api/jobs/my-schedule", headers=tech_headers).json() if j["order_id"] == order_id)
    assert client.post(f"/api/jobs/{job['id']}/start", headers=tech_headers).status_code == 400

    db = SessionLocal()
    db.query(Order).filter(Order.id == order_id).update({"status": OrderStatus.DELIVERED})
    db.commit()
    db.close()

    client.post(f"/api/jobs/{job['id']}/start", headers=tech_headers)
    done = client.post(f"/api/jobs/{job['id']}/complete", headers=tech_headers, json={
        "confirmed_capacity_kw": 3.0, "power_generating": True, "customer_name": "Linkage Test",
        "signature_data": "data:image/png;base64,AAAA",
    })
    assert done.status_code == 200, done.text

    # Full payment after install closes the order and marks the invoice paid
    paid = client.post(f"/api/orders/{order_id}/payments", headers=sales_headers, json={
        "amount": order["total_amount"], "method": "BANK",
    })
    assert paid.status_code in (200, 201), paid.text
    assert client.get(f"/api/orders/{order_id}", headers=admin_headers).json()["status"] == "CLOSED"
    assert client.get(f"/api/finance/invoices?order_id={order_id}", headers=admin_headers).json()[0]["status"] == "PAID"
