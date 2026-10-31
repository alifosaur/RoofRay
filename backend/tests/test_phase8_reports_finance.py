from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
admin_headers = {"Authorization": "Bearer admin_uid"}
accounts_headers = {"Authorization": "Bearer accounts_uid"}


def test_director_dashboard_and_profit_metrics():
    # 1. Query dashboard metrics
    res = client.get("/api/reports/dashboard?range=all", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "revenue" in data
    assert "collected_payments" in data
    assert "pending_payments" in data
    assert "net_profit" in data
    assert "profitable_jobs_count" in data
    assert "unfinished_by_stage" in data

    # 2. Query profit per job
    pj_res = client.get("/api/reports/profit-per-job?range=all", headers=admin_headers)
    assert pj_res.status_code == 200
    jobs = pj_res.json()
    assert isinstance(jobs, list)
    if len(jobs) > 0:
        j = jobs[0]
        assert "revenue" in j
        assert "stock_cost" in j
        assert "technician_cost" in j
        assert "net_profit" in j
        assert "margin_pct" in j

    # 3. Test Excel export
    excel_res = client.get("/api/reports/export.xlsx", headers=admin_headers)
    assert excel_res.status_code == 200
    assert "spreadsheetml.sheet" in excel_res.headers["content-type"]
    assert len(excel_res.content) > 1000

    # 4. Test Shareable Expiring Link
    share_res = client.post("/api/reports/share-link?expires_days=7", headers=admin_headers)
    assert share_res.status_code == 200
    token = share_res.json()["share_token"]

    # Public unauthenticated query using token
    pub_res = client.get(f"/api/reports/shared/{token}")
    assert pub_res.status_code == 200
    assert pub_res.json()["revenue"] == data["revenue"]

    # Invalid token check
    invalid_res = client.get("/api/reports/shared/bogus-invalid-token")
    assert invalid_res.status_code == 401


def test_sales_metrics_and_commissions():
    sales_headers = {"Authorization": "Bearer sales_uid"}

    # 1. Test sales metrics as sales user (triggers sales_user_id filtering and Quote join)
    sales_res = client.get("/api/reports/sales-metrics", headers=sales_headers)
    assert sales_res.status_code == 200
    s_data = sales_res.json()
    assert "conversion_rate_pct" in s_data
    assert "commission_earned" in s_data
    assert "pipeline_value" in s_data
    assert "deals" in s_data

    # 2. Test sales metrics as admin (all sales team)
    admin_res = client.get("/api/reports/sales-metrics", headers=admin_headers)
    assert admin_res.status_code == 200
    a_data = admin_res.json()
    assert "conversion_rate_pct" in a_data
    assert "deals" in a_data


