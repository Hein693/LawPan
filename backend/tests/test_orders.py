import pytest
from app.main import app
from app.core.database import SessionLocal
from app.models.entities import RestaurantTable, MenuItem, Order, OrderItem, KitchenTicket

def test_order_creation_and_price_snapshotting(client):
    waiter_token = client.post("/api/v1/auth/login", json={"username": "waiter", "password": "lawpan123"}).json()["access_token"]
    owner_token = client.post("/api/v1/auth/login", json={"username": "owner", "password": "lawpan123"}).json()["access_token"]

    db = SessionLocal()
    table = db.query(RestaurantTable).filter(RestaurantTable.table_number == "T-01").first()
    item1 = db.query(MenuItem).filter(MenuItem.name_en == "Yangzhou Fried Rice").first()
    item2 = db.query(MenuItem).filter(MenuItem.name_en == "Steamed Shrimp Dumplings (Har Gow)").first()
    table_id = table.id
    item1_id = item1.id
    item2_id = item2.id
    original_item1_price = item1.base_price
    db.close()

    # 1. Waiter creates an order
    order_payload = {
        "table_id": table_id,
        "items": [
            {
                "menu_item_id": item1_id,
                "quantity": 2,
                "variant_name": "Large (ပွဲကြီး)",
                "variant_price_adjustment": 3000.0,
                "special_instructions": "Less oil, extra scallions"
            },
            {
                "menu_item_id": item2_id,
                "quantity": 1,
                "special_instructions": "Steam very hot"
            }
        ],
        "notes": "VIP Guest dining in",
        "discount_amount": 0.0
    }

    resp = client.post("/api/v1/orders", json=order_payload, headers={"Authorization": f"Bearer {waiter_token}"})
    assert resp.status_code == 201
    created_order = resp.json()
    order_id = created_order["id"]

    assert created_order["order_number"].startswith("LP-")
    assert len(created_order["items"]) == 2
    assert created_order["status"] == "PENDING"
    assert created_order["payment_status"] == "UNPAID"

    # 2. Check Table Status changed to OCCUPIED
    db = SessionLocal()
    updated_table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
    assert updated_table.status == "OCCUPIED"
    assert updated_table.current_order_id == order_id

    # 3. Check Kitchen Tickets were automatically generated
    tickets = db.query(KitchenTicket).filter(KitchenTicket.order_id == order_id).all()
    assert len(tickets) == 2
    station_codes = {t.station_code for t in tickets}
    assert "RICE_STATION" in station_codes
    assert "DIM_SUM_STATION" in station_codes
    db.close()

    # 4. Price Snapshotting Verification:
    # Change menu item price now, old order item MUST retain original price!
    client.put(
        f"/api/v1/menu/items/{item1_id}",
        json={"base_price": 99999.0}, # Dramatic price increase
        headers={"Authorization": f"Bearer {owner_token}"}
    )

    # Re-fetch order
    fetch_order_resp = client.get(f"/api/v1/orders/{order_id}")
    assert fetch_order_resp.status_code == 200
    refetched = fetch_order_resp.json()
    saved_item1 = [it for it in refetched["items"] if it["menu_item_id"] == item1_id][0]

    # Must equal original price + variant adjustment, NOT 99999.0
    expected_historical_unit_price = original_item1_price + 3000.0
    assert saved_item1["unit_price"] == expected_historical_unit_price
    assert saved_item1["unit_price"] != 99999.0

    # 5. Add Extra Items to the Open Order
    add_resp = client.post(
        f"/api/v1/orders/{order_id}/items",
        json={
            "items": [
                {
                    "menu_item_id": item2_id,
                    "quantity": 1,
                    "special_instructions": "Additional round"
                }
            ]
        },
        headers={"Authorization": f"Bearer {waiter_token}"}
    )
    assert add_resp.status_code == 200
    updated_order_data = add_resp.json()
    assert len(updated_order_data["items"]) == 3 # 2 original + 1 added
    assert updated_order_data["total_amount"] > created_order["total_amount"]

    # 6. Status advancement
    status_resp = client.patch(
        f"/api/v1/orders/{order_id}/status?status=PREPARING",
        headers={"Authorization": f"Bearer {waiter_token}"}
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "PREPARING"

    # Reset price back
    client.put(
        f"/api/v1/menu/items/{item1_id}",
        json={"base_price": original_item1_price},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
