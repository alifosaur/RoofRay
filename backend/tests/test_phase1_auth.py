import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_auth_me_unauthorized():
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_auth_me_admin():
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer admin_uid"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@test.local"
    assert data["role"] == "admin"


def test_role_enforcement_admin_endpoint():
    # Admin access succeeds
    admin_res = client.get("/api/users", headers={"Authorization": "Bearer admin_uid"})
    assert admin_res.status_code == 200
    users = admin_res.json()
    assert len(users) >= 6

    # Technician access to admin-only endpoint fails with 403
    tech_res = client.get("/api/users", headers={"Authorization": "Bearer tech_uid"})
    assert tech_res.status_code == 403
    assert "Forbidden" in tech_res.json()["detail"]

