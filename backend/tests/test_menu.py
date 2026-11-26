import pytest
from app.main import app

def test_menu_categories_and_items(client):
    owner_token = client.post("/api/v1/auth/login", json={"username": "owner", "password": "lawpan123"}).json()["access_token"]
    waiter_token = client.post("/api/v1/auth/login", json={"username": "waiter", "password": "lawpan123"}).json()["access_token"]

    # 1. List Categories
    cat_resp = client.get("/api/v1/menu/categories")
    assert cat_resp.status_code == 200
    categories = cat_resp.json()
    assert len(categories) >= 10
    cat_id = categories[0]["id"]

    # 2. Create Category as Owner
    new_cat_resp = client.post(
        "/api/v1/menu/categories",
        json={"name_en": "Chef Specials", "name_mm": "စားဖိုမှူး အထူးဟင်းလျာ", "display_order": 99},
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert new_cat_resp.status_code == 201
    created_cat = new_cat_resp.json()
    assert created_cat["name_en"] == "Chef Specials"

    # 3. Create Menu Item under that category with Variants
    new_item_resp = client.post(
        "/api/v1/menu/items",
        json={
            "category_id": created_cat["id"],
            "name_en": "Sichuan Mapo Tofu",
            "name_mm": "စီချွမ် မာပိုတိုဖူး ပဲပြားဟင်း",
            "description_en": "Silken tofu set in a spicy, numbing chili and bean paste sauce.",
            "description_mm": "အစပ်အရသာနှင့် အမွှေးအကြိုင်တို့ဖြင့် ချက်ပြုတ်ထားသော နာမည်ကျော်တိုဖူး",
            "base_price": 7500.0,
            "station": "MAIN_KITCHEN",
            "estimated_prep_time": 10,
            "variants": [
                {"name": "Regular (ပုံမှန်)", "price_adjustment": 0.0},
                {"name": "Extra Meat (အသားတိုး)", "price_adjustment": 2000.0}
            ]
        },
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert new_item_resp.status_code == 201
    item_data = new_item_resp.json()
    assert item_data["name_en"] == "Sichuan Mapo Tofu"
    assert len(item_data["variants"]) == 2
    item_id = item_data["id"]

    # 4. Search Filter
    search_resp = client.get("/api/v1/menu/items?search=Mapo")
    assert search_resp.status_code == 200
    assert any(i["id"] == item_id for i in search_resp.json())

    # Search by Burmese script
    search_mm_resp = client.get("/api/v1/menu/items?search=မာပိုတိုဖူး")
    assert search_mm_resp.status_code == 200
    assert any(i["id"] == item_id for i in search_mm_resp.json())

    # 5. Toggle Availability (e.g. 86-ed / Sold out)
    avail_resp = client.patch(
        f"/api/v1/menu/items/{item_id}/availability?available=false",
        headers={"Authorization": f"Bearer {waiter_token}"}
    )
    assert avail_resp.status_code == 200
    assert avail_resp.json()["is_available"] is False

    # 6. Waiter attempting to delete menu item -> FORBIDDEN 403
    del_waiter_resp = client.delete(
        f"/api/v1/menu/items/{item_id}",
        headers={"Authorization": f"Bearer {waiter_token}"}
    )
    assert del_waiter_resp.status_code == 403

    # 7. Owner deleting menu item -> SUCCESS 200
    del_owner_resp = client.delete(
        f"/api/v1/menu/items/{item_id}",
        headers={"Authorization": f"Bearer {owner_token}"}
    )
    assert del_owner_resp.status_code == 200
