import pytest
from app.main import app

def test_dashboard_rbac_enforcement(client):
    # Logins
    owner_token = client.post("/api/v1/auth/login", json={"username": "owner", "password": "lawpan123"}).json()["access_token"]
    waiter_token = client.post("/api/v1/auth/login", json={"username": "waiter", "password": "lawpan123"}).json()["access_token"]
    cashier_token = client.post("/api/v1/auth/login", json={"username": "cashier", "password": "lawpan123"}).json()["access_token"]
    kitchen_token = client.post("/api/v1/auth/login", json={"username": "kitchen", "password": "lawpan123"}).json()["access_token"]
    manager_token = client.post("/api/v1/auth/login", json={"username": "manager", "password": "lawpan123"}).json()["access_token"]

    # 1. Owner dashboard access
    owner_resp = client.get("/api/v1/dashboard/owner", headers={"Authorization": f"Bearer {owner_token}"})
    assert owner_resp.status_code == 200
    owner_data = owner_resp.json()
    assert "today_revenue" in owner_data
    assert "best_selling_food" in owner_data
    assert "sales_chart" in owner_data

    # 2. Waiter attempting to access Owner dashboard -> MUST BE REJECTED 403
    waiter_forbidden_resp = client.get("/api/v1/dashboard/owner", headers={"Authorization": f"Bearer {waiter_token}"})
    assert waiter_forbidden_resp.status_code == 403

    # 3. Waiter accessing Waiter dashboard -> SUCCESS 200
    waiter_resp = client.get("/api/v1/dashboard/waiter", headers={"Authorization": f"Bearer {waiter_token}"})
    assert waiter_resp.status_code == 200
    assert "tables" in waiter_resp.json()

    # 4. Cashier accessing Cashier dashboard -> SUCCESS 200
    cashier_resp = client.get("/api/v1/dashboard/cashier", headers={"Authorization": f"Bearer {cashier_token}"})
    assert cashier_resp.status_code == 200
    assert "unpaid_orders" in cashier_resp.json()

    # 5. Kitchen accessing Kitchen dashboard -> SUCCESS 200
    kitchen_resp = client.get("/api/v1/dashboard/kitchen", headers={"Authorization": f"Bearer {kitchen_token}"})
    assert kitchen_resp.status_code == 200
    assert "stations" in kitchen_resp.json()

    # 6. Manager accessing Manager dashboard -> SUCCESS 200
    manager_resp = client.get("/api/v1/dashboard/manager", headers={"Authorization": f"Bearer {manager_token}"})
    assert manager_resp.status_code == 200
    assert "occupancy_rate" in manager_resp.json()
