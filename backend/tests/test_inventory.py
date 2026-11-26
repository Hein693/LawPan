import pytest
from app.core.database import SessionLocal
from app.models.entities import Ingredient, MenuItem, Recipe

def test_inventory_and_recipe_management(client):
    manager_token = client.post("/api/v1/auth/login", json={"username": "manager", "password": "lawpan123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {manager_token}"}

    # 1. List ingredients
    ing_res = client.get("/api/v1/inventory/ingredients", headers=headers)
    assert ing_res.status_code == 200
    ingredients = ing_res.json()
    assert len(ingredients) > 0

    # 2. Create a new ingredient
    new_ing_payload = {
        "name_en": "Shiitake Mushrooms",
        "name_mm": "မှိုမဲ",
        "category": "Vegetables",
        "unit": "kg",
        "current_stock": 10.0,
        "minimum_stock": 2.0,
        "purchase_price": 8500.0
    }
    create_ing_res = client.post("/api/v1/inventory/ingredients", json=new_ing_payload, headers=headers)
    assert create_ing_res.status_code == 201
    created_ing = create_ing_res.json()
    ing_id = created_ing["id"]
    assert created_ing["name_en"] == "Shiitake Mushrooms"

    # 3. Stock adjustment: Wastage of 1.5 kg
    adjust_payload = {
        "ingredient_id": ing_id,
        "quantity": -1.5,
        "transaction_type": "WASTAGE",
        "notes": "Spoiled batch disposed"
    }
    adj_res = client.post("/api/v1/inventory/adjust", json=adjust_payload, headers=headers)
    assert adj_res.status_code == 200
    assert adj_res.json()["current_stock"] == 8.5

    # 4. Check transactions
    tx_res = client.get("/api/v1/inventory/transactions", headers=headers)
    assert tx_res.status_code == 200
    txs = tx_res.json()
    assert any(t["ingredient_id"] == ing_id and t["transaction_type"] == "WASTAGE" for t in txs)

    # 5. Create or update a recipe
    db = SessionLocal()
    menu_item = db.query(MenuItem).first()
    menu_item_id = menu_item.id
    db.close()

    recipe_payload = {
        "menu_item_id": menu_item_id,
        "name": f"Chef Standard Recipe for {menu_item.name_en}",
        "instructions": "Stir fry on high wok heat with sesame oil",
        "items": [
            {"ingredient_id": ing_id, "quantity": 0.2, "unit": "kg"}
        ]
    }
    recipe_res = client.post("/api/v1/inventory/recipes", json=recipe_payload, headers=headers)
    assert recipe_res.status_code == 201
    recipe_data = recipe_res.json()
    assert len(recipe_data["items"]) == 1
    assert recipe_data["items"][0]["ingredient_id"] == ing_id

    # 6. Supplier registration
    supplier_payload = {
        "name": "Yangon Fresh Produce Wholesale",
        "contact_person": "U Kyaw Min",
        "phone": "+95 9 111 222 333",
        "address": "Thirimingalar Market, Hledan, Yangon"
    }
    sup_res = client.post("/api/v1/inventory/suppliers", json=supplier_payload, headers=headers)
    assert sup_res.status_code == 201
    supplier = sup_res.json()
    supplier_id = supplier["id"]

    # 7. Purchase Order creation
    po_payload = {
        "supplier_id": supplier_id,
        "notes": "Weekly fresh mushroom replenishment",
        "items": [
            {"ingredient_id": ing_id, "quantity": 20.0, "unit_cost": 8500.0}
        ]
    }
    po_res = client.post("/api/v1/inventory/purchase-orders", json=po_payload, headers=headers)
    assert po_res.status_code == 201
    po = po_res.json()
    po_id = po["id"]
    assert po["total_amount"] == 170000.0

    # 8. Receive Purchase Order goods into stock
    receive_res = client.patch(f"/api/v1/inventory/purchase-orders/{po_id}/receive", headers=headers)
    assert receive_res.status_code == 200

    # Verify ingredient stock increased by 20 kg (from 8.5 to 28.5)
    ing_check = client.get(f"/api/v1/inventory/ingredients?search=Shiitake", headers=headers)
    assert ing_check.status_code == 200
    assert ing_check.json()[0]["current_stock"] == 28.5
