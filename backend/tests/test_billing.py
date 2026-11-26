import pytest
from app.core.database import SessionLocal
from app.models.entities import InventoryTransaction

def test_billing_lifecycle(client):
    token_cashier = client.post("/api/v1/auth/login", json={"username": "cashier", "password": "lawpan123"}).json()["access_token"]
    token_waiter = client.post("/api/v1/auth/login", json={"username": "waiter", "password": "lawpan123"}).json()["access_token"]
    token_manager = client.post("/api/v1/auth/login", json={"username": "manager", "password": "lawpan123"}).json()["access_token"]
    
    headers_cashier = {"Authorization": f"Bearer {token_cashier}"}
    headers_waiter = {"Authorization": f"Bearer {token_waiter}"}
    headers_manager = {"Authorization": f"Bearer {token_manager}"}

    # 1. Create a dining order with waiter
    tables_res = client.get("/api/v1/tables", headers=headers_waiter)
    table = [t for t in tables_res.json() if t["status"] == "AVAILABLE"][0]
    
    menu_res = client.get("/api/v1/menu/items", headers=headers_waiter)
    items = menu_res.json()
    item1 = items[0]
    item2 = items[1]

    order_payload = {
        "table_id": table["id"],
        "order_type": "DINE_IN",
        "guest_count": 2,
        "items": [
            {"menu_item_id": item1["id"], "quantity": 2, "special_instructions": "Less spicy"},
            {"menu_item_id": item2["id"], "quantity": 1}
        ]
    }
    create_res = client.post("/api/v1/orders", json=order_payload, headers=headers_waiter)
    assert create_res.status_code == 201
    created_order = create_res.json()
    order_id = created_order["id"]
    expected_subtotal = (item1["base_price"] * 2) + item2["base_price"]
    assert created_order["subtotal"] == expected_subtotal

    # 2. Cashier checks unpaid orders
    unpaid_res = client.get("/api/v1/billing/unpaid", headers=headers_cashier)
    assert unpaid_res.status_code == 200
    unpaid_list = unpaid_res.json()
    assert any(o["id"] == order_id for o in unpaid_list)

    # 3. Process payment with Cash + 10% discount
    tendered = expected_subtotal + 5000.0
    pay_payload = {
        "order_id": order_id,
        "payment_method": "CASH",
        "cash_tendered": tendered,
        "discount_percent": 10.0
    }
    pay_res = client.post("/api/v1/billing/pay", json=pay_payload, headers=headers_cashier)
    assert pay_res.status_code == 200
    pay_data = pay_res.json()
    
    expected_discount = expected_subtotal * 0.10
    expected_total = expected_subtotal - expected_discount
    expected_change = tendered - expected_total

    assert pay_data["amount_paid"] == expected_total
    assert pay_data["cash_tendered"] == tendered
    assert pay_data["change_returned"] == expected_change
    payment_id = pay_data["id"]

    # 4. Verify table is now CLEANING
    table_check = client.get(f"/api/v1/tables/{table['id']}", headers=headers_cashier)
    assert table_check.status_code == 200
    assert table_check.json()["status"] == "CLEANING"

    # 5. Verify receipt data
    receipt_res = client.get(f"/api/v1/billing/receipt/{order_id}", headers=headers_cashier)
    assert receipt_res.status_code == 200
    receipt = receipt_res.json()
    assert receipt["restaurant_name"] == "LAW PAN CHINESE RESTAURANT"
    assert receipt["total_amount"] == expected_total
    assert receipt["discount_amount"] == expected_discount
    assert len(receipt["items"]) == 2

    # 6. Verify cash drawer reconciliation
    recon_res = client.get("/api/v1/billing/drawer-reconciliation", headers=headers_cashier)
    assert recon_res.status_code == 200
    recon = recon_res.json()
    assert recon["cash_drawer"] >= expected_total

    # 7. Test refund authorization: Cashier cannot approve refund (requires MANAGER/OWNER)
    refund_payload = {
        "payment_id": payment_id,
        "amount": expected_total,
        "reason": "Customer had emergency and left before food served"
    }
    cashier_refund_res = client.post("/api/v1/billing/refund", json=refund_payload, headers=headers_cashier)
    assert cashier_refund_res.status_code == 403

    # Manager approves refund
    mgr_refund_res = client.post("/api/v1/billing/refund", json=refund_payload, headers=headers_manager)
    assert mgr_refund_res.status_code == 200
    refund_data = mgr_refund_res.json()
    assert refund_data["amount"] == expected_total
