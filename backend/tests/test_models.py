import pytest
from app.core.database import SessionLocal
from app.models.entities import (
    Role, User, MenuCategory, MenuItem, RestaurantTable, 
    KitchenStation, Ingredient, Recipe
)

def test_database_seeded_entities():
    db = SessionLocal()
    try:
        # Check Roles
        roles = db.query(Role).all()
        role_names = {r.name for r in roles}
        assert {"OWNER", "MANAGER", "WAITER", "CASHIER", "KITCHEN"}.issubset(role_names)

        # Check Staff Users
        users = db.query(User).all()
        user_names = {u.username for u in users}
        assert {"owner", "manager", "waiter", "cashier", "kitchen"}.issubset(user_names)

        # Check Chinese Menu Categories
        categories = db.query(MenuCategory).all()
        assert len(categories) >= 10
        cat_names = {c.name_en for c in categories}
        assert "Dim Sum" in cat_names
        assert "Rice and Fried Rice" in cat_names
        assert "Noodles & Soups" in cat_names

        # Check Authentic Chinese Menu Items
        items = db.query(MenuItem).all()
        assert len(items) >= 10
        item_names = {i.name_en for i in items}
        assert "Yangzhou Fried Rice" in item_names
        assert "Steamed Shrimp Dumplings (Har Gow)" in item_names
        assert "Kung Pao Chicken (Gong Bao)" in item_names

        # Check Tables
        tables = db.query(RestaurantTable).all()
        assert len(tables) >= 10
        table_numbers = {t.table_number for t in tables}
        assert "T-01" in table_numbers
        assert "VIP-01" in table_numbers

        # Check Kitchen Stations
        stations = db.query(KitchenStation).all()
        station_codes = {s.code for s in stations}
        assert {"MAIN_KITCHEN", "NOODLE_STATION", "RICE_STATION", "DIM_SUM_STATION", "DRINKS_STATION"}.issubset(station_codes)

        # Check Recipe and Ingredients
        ingredients = db.query(Ingredient).all()
        assert len(ingredients) >= 5
        recipes = db.query(Recipe).all()
        assert len(recipes) >= 1

    finally:
        db.close()
