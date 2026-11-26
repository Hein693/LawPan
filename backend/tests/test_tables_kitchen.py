import pytest
from app.main import app
from app.core.database import SessionLocal
from app.models.entities import RestaurantTable, MenuItem, Order, KitchenTicket
from datetime import datetime, timezone, timedelta

def test_table_operations_and_kitchen_workflow(client):
    waiter_token = client.post("/api/v1/auth/login", json={"username": "waiter", "password": "lawpan123"}).json()["access_token"]
    owner_token = client.post("/api/v1/auth/login", json={"username": "owner", "password": "lawpan123"}).json()["access_token"]
    kitchen_token = client.post("/api/v1/auth/login", json={"username": "kitchen", "password": "lawpan123"}).json()["access_token"]

    db = SessionLocal()
    t_source = db.query(RestaurantTable).filter(RestaurantTable.table_number == "T-04").first()
    t_target = db.query(RestaurantTable).filter(RestaurantTable.table_number == "T-05").first()
    food_item = db.query(MenuItem).filter(MenuItem.name_en == "Kung Pao Chicken (Gong Bao)").first()

    # Ensure T-05 is available before transfer test
    t_target.status = "AVAILABLE"
    t_target.current_order_id = None
    db.commit()

    source_id = t_source.id
    target_id = t_target.id
    item_id = food_item.id
    db.close()

    # 1. Create an order on source table (T-04)
    create_order_resp = client.post(
        "/api/v1/orders",
        json={
            "table_id": source_id,
            "items": [{"menu_item_id": item_id, "quantity": 1, "special_instructions": "Extra spicy"}]
        },
        headers={"Authorization": f"Bearer {waiter_token}"}
    )
    assert create_order_resp.status_code == 201
    order_data = create_order_resp.json()
    order_id = order_data["id"]

    # 2. Verify Table T-04 is occupied
    tables_resp = client.get("/api/v1/tables")
    assert tables_resp.status_code == 200
    t04 = [t for t in tables_resp.json() if t["id"] == source_id][0]
    assert t04["status"] == "OCCUPIED"
    assert t04["current_order_id"] == order_id

    # 3. Transfer Order from T-04 to T-05
    transfer_resp = client.post(
        "/api/v1/tables/transfer",
        json={"from_table_id": source_id, "to_table_id": target_id},
        headers={"Authorization": f"Bearer {waiter_token}"}
    )
    print("TRANSFER STATUS:", transfer_resp.status_code, transfer_resp.json())
    assert transfer_resp.status_code == 200
    assert "successfully transferred" in transfer_resp.json()["message"]

    # Verify T-05 is now OCCUPIED and T-04 is CLEANING
    tables_after = client.get("/api/v1/tables").json()
    t04_after = [t for t in tables_after if t["id"] == source_id][0]
    t05_after = [t for t in tables_after if t["id"] == target_id][0]
    assert t04_after["status"] == "CLEANING"
    assert t04_after["current_order_id"] is None
    assert t05_after["status"] == "OCCUPIED"
    assert t05_after["current_order_id"] == order_id

    # 4. Clean Table T-04 -> marks AVAILABLE
    clean_resp = client.patch(
        f"/api/v1/tables/{source_id}/status",
        json={"status": "AVAILABLE"},
        headers={"Authorization": f"Bearer {waiter_token}"}
    )
    assert clean_resp.status_code == 200
    assert clean_resp.json()["status"] == "AVAILABLE"

    # 5. Book Table Reservation
    booking_time = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    res_resp = client.post(
        "/api/v1/tables/reservations",
        json={
            "table_id": source_id,
            "customer_name": "Daw Khin Khin",
            "customer_phone": "09-450012345",
            "party_size": 4,
            "reservation_time": booking_time,
            "notes": "Anniversary dinner banquet"
        },
        headers={"Authorization": f"Bearer {waiter_token}"}
    )
    assert res_resp.status_code == 201
    res_data = res_resp.json()
    assert res_data["customer_name"] == "Daw Khin Khin"
    assert res_data["status"] == "CONFIRMED"

    # 6. Kitchen Tickets and KDS Status Advance
    k_resp = client.get(f"/api/v1/kitchen/tickets")
    assert k_resp.status_code == 200
    tickets = k_resp.json()
    my_ticket = [t for t in tickets if t["order_id"] == order_id][0]
    ticket_id = my_ticket["id"]
    assert my_ticket["status"] == "PENDING"
    assert my_ticket["special_instructions"] == "Extra spicy"

    # Advance to PREPARING
    prep_resp = client.patch(
        f"/api/v1/kitchen/tickets/{ticket_id}/status",
        json={"status": "PREPARING"},
        headers={"Authorization": f"Bearer {kitchen_token}"}
    )
    assert prep_resp.status_code == 200
    assert prep_resp.json()["status"] == "PREPARING"
    assert prep_resp.json()["started_at"] is not None

    # Advance to READY
    ready_resp = client.patch(
        f"/api/v1/kitchen/tickets/{ticket_id}/status",
        json={"status": "READY"},
        headers={"Authorization": f"Bearer {kitchen_token}"}
    )
    assert ready_resp.status_code == 200
    assert ready_resp.json()["status"] == "READY"
    assert ready_resp.json()["completed_at"] is not None
