"""Workflow helpers for tests: each one walks a real hand-off through the API."""
import uuid

SALES = {"Authorization": "Bearer sales_uid"}
WAREHOUSE = {"Authorization": "Bearer warehouse_uid"}


def call_checklist(client, lead_id, headers=SALES):
    res = client.post(f"/api/leads/{lead_id}/checklist", headers=headers, json={
        "shadow_free_area_sqft": 400, "monthly_bill_amount": 3000, "is_grid_suitable": True,
    })
    assert res.status_code == 200, res.text
    return res


def send_and_accept(client, quote_id, headers=SALES):
    sent = client.post(f"/api/quotes/{quote_id}/send", headers=headers)
    assert sent.status_code == 200, sent.text
    return client.post(f"/api/quotes/{quote_id}/accept", headers=headers)


def confirm_with_advance(client, order_id, headers=SALES, fraction=0.3):
    order = client.get(f"/api/orders/{order_id}", headers=headers).json()
    pay = client.post(f"/api/orders/{order_id}/payments", headers=headers, json={
        "amount": round(order["total_amount"] * fraction, 2), "method": "UPI", "transaction_ref": "ADV-TEST",
    })
    assert pay.status_code == 201, pay.text
    # Orders are confirmed on quote acceptance; confirm only if still a draft
    if client.get(f"/api/orders/{order_id}", headers=headers).json()["status"] == "DRAFT":
        return client.post(f"/api/orders/{order_id}/confirm", headers=headers)
    return client.get(f"/api/orders/{order_id}", headers=headers)


def scan_all_serials(client, order_id, headers=WAREHOUSE):
    """Registers and scans one serial per required serialised unit; returns the serial numbers."""
    order = client.get(f"/api/orders/{order_id}", headers=headers).json()
    quote = client.get(f"/api/quotes/{order['quote_id']}", headers={"Authorization": "Bearer admin_uid"}).json()
    serials = []
    for line in quote["lines"]:
        if not line["product"]["is_serialised"]:
            continue
        sns = [f"T-{uuid.uuid4().hex[:10].upper()}" for _ in range(line["quantity"])]
        reg = client.post("/api/dispatch/serials/register", headers=headers, json={"product_id": line["product_id"], "serial_numbers": sns})
        assert reg.status_code == 201, reg.text
        for sn in sns:
            res = client.post("/api/dispatch/scan", headers=headers, json={"order_id": order_id, "serial_no": sn})
            assert res.status_code == 200, res.text
        serials += sns
    return serials


def advance(client, order_id, stage, headers=WAREHOUSE):
    return client.put(f"/api/dispatch/orders/{order_id}/stage", headers=headers, json={"stage": stage})


def ship_to_delivered(client, order_id, headers=WAREHOUSE):
    serials = scan_all_serials(client, order_id, headers)
    for stage in ("PACKED", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED"):
        res = advance(client, order_id, stage, headers)
        assert res.status_code == 200, f"{stage}: {res.text}"
    return serials


TECH = {"Authorization": "Bearer tech_uid"}
ADMIN = {"Authorization": "Bearer admin_uid"}


def approved_lead(client, name="Test Customer", template_kw=1.0):
    """Public lead → call checklist → survey scheduled, submitted and approved. Returns (lead, template_id)."""
    phone = f"9{uuid.uuid4().int % 10**9:09d}"
    lead = client.post("/api/leads/public", json={"name": name, "phone": phone, "address": "1 Test Road", "required_capacity": template_kw}).json()
    sales = SALES if lead.get("assigned_to_id") else ADMIN
    tech_id = next(u["id"] for u in client.get("/api/users?role=technician", headers=ADMIN).json() if u["firebase_uid"] == "tech_uid")
    call_checklist(client, lead["id"], sales)
    survey = client.post("/api/surveys", headers=sales, json={"lead_id": lead["id"], "technician_id": tech_id,
                                                                "scheduled_date": "2030-01-01T10:00:00"}).json()
    sub = client.put(f"/api/surveys/{survey['id']}/complete", headers=TECH, json={
        "roof_direction": "South", "roof_tilt_deg": 20, "cable_distance_meters": 10, "address_confirmed": True,
        "shadow_free_area_sqft": 350, "out_of_shade_zone": True})
    assert sub.status_code == 200, sub.text
    assert client.post(f"/api/surveys/{survey['id']}/approve", headers=sales).status_code == 200
    template_id = next(t["id"] for t in client.get("/api/bom-templates", headers=sales).json()
                       if t["capacity_kw"] == template_kw and t["system_type"] == "On-Grid")
    return lead, template_id, sales


def confirmed_order(client, name="Test Customer"):
    lead, template_id, sales = approved_lead(client, name)
    quote = client.post("/api/quotes", headers=sales, json={"lead_id": lead["id"], "template_id": template_id}).json()
    order_id = send_and_accept(client, quote["id"], sales).json()["order_id"]
    res = confirm_with_advance(client, order_id, sales)
    assert res.status_code == 200, res.text
    return {"lead": lead, "quote": quote, "order_id": order_id, "sales": sales}


def register(client, payload: dict):
    """Customer sign-up the way the UI does it: request the emailed code, then register with it."""
    from app.core import mailer
    sent = client.post("/api/auth/register/request-otp", json={"email": payload["email"]})
    if sent.status_code != 200:
        return sent
    code = next(m["subject"].rsplit(" ", 1)[-1] for m in reversed(mailer.outbox) if m["to"] == payload["email"].lower())
    return client.post("/api/auth/register", json={**payload, "otp": code})
