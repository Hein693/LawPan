import pytest

def test_reports_and_financial_analytics(client):
    owner_token = client.post("/api/v1/auth/login", json={"username": "owner", "password": "lawpan123"}).json()["access_token"]
    manager_token = client.post("/api/v1/auth/login", json={"username": "manager", "password": "lawpan123"}).json()["access_token"]
    
    headers_owner = {"Authorization": f"Bearer {owner_token}"}
    headers_manager = {"Authorization": f"Bearer {manager_token}"}

    # 1. Sales Overview
    res = client.get("/api/v1/reports/sales-overview", headers=headers_manager)
    assert res.status_code == 200
    overview = res.json()
    assert "total_revenue" in overview
    assert "payment_methods" in overview
    assert "average_order_value" in overview

    # 2. Sales by Category
    cat_res = client.get("/api/v1/reports/by-category", headers=headers_manager)
    assert cat_res.status_code == 200
    cats = cat_res.json()
    assert isinstance(cats, list)

    # 3. Sales by Item
    item_res = client.get("/api/v1/reports/by-item", headers=headers_manager)
    assert item_res.status_code == 200
    items = item_res.json()
    assert isinstance(items, list)

    # 4. Sales by Waiter
    waiter_res = client.get("/api/v1/reports/by-waiter", headers=headers_manager)
    assert waiter_res.status_code == 200
    waiters = waiter_res.json()
    assert isinstance(waiters, list)

    # 5. Profit & Loss: Restricted to OWNER only
    mgr_pl_res = client.get("/api/v1/reports/profit-loss", headers=headers_manager)
    assert mgr_pl_res.status_code == 403

    owner_pl_res = client.get("/api/v1/reports/profit-loss", headers=headers_owner)
    assert owner_pl_res.status_code == 200
    pl = owner_pl_res.json()
    assert "gross_revenue" in pl
    assert "cost_of_goods_sold" in pl
    assert "gross_profit" in pl
    assert "total_operating_expenses" in pl
    assert "net_profit" in pl
    assert pl["gross_profit"] == pl["gross_revenue"] - pl["cost_of_goods_sold"]
    assert pl["net_profit"] == pl["gross_profit"] - pl["total_operating_expenses"]

    # 6. CSV Export
    csv_res = client.get("/api/v1/reports/export-csv", headers=headers_manager)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Order Number" in csv_res.text
