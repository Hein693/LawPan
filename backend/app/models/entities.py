from datetime import datetime, timezone
from typing import List, Optional

def utc_now():
    return datetime.now(timezone.utc)
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, 
    Text, Table, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base

# Association Table for Role and Permission
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

# Association Table for Menu Item Addons
menu_item_addons = Table(
    "menu_item_addons",
    Base.metadata,
    Column("menu_item_id", Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), primary_key=True),
    Column("addon_id", Integer, ForeignKey("menu_addons.id", ondelete="CASCADE"), primary_key=True),
)

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True) # OWNER, MANAGER, WAITER, CASHIER, KITCHEN
    description = Column(String(255), nullable=True)

    users = relationship("User", back_populates="role")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True) # e.g. orders:create, reports:view
    name = Column(String(100), nullable=False)
    module = Column(String(50), nullable=False) # orders, menu, billing, reports, etc.
    description = Column(String(255), nullable=True)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    employee_id = Column(String(50), unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    role = relationship("Role", back_populates="users")
    employee = relationship("Employee", back_populates="user", uselist=False)
    orders = relationship("Order", back_populates="waiter", foreign_keys="Order.waiter_id")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=True)
    position = Column(String(50), nullable=False)
    base_salary = Column(Float, default=0.0) # Restricted to authorized owner/manager
    hire_date = Column(DateTime, default=utc_now)
    status = Column(String(20), default="ACTIVE") # ACTIVE, ON_LEAVE, TERMINATED
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="employee")
    attendances = relationship("Attendance", back_populates="employee")

class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id = Column(Integer, primary_key=True, index=True)
    name_en = Column(String(100), nullable=False)
    name_mm = Column(String(100), nullable=False)
    icon = Column(String(50), nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    items = relationship("MenuItem", back_populates="category", cascade="all, delete-orphan")

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("menu_categories.id"), nullable=False, index=True)
    name_en = Column(String(150), nullable=False, index=True)
    name_mm = Column(String(150), nullable=False, index=True)
    description_en = Column(Text, nullable=True)
    description_mm = Column(Text, nullable=True)
    base_price = Column(Float, nullable=False)
    image_url = Column(String(255), nullable=True)
    station = Column(String(50), default="MAIN_KITCHEN") # MAIN_KITCHEN, NOODLE_STATION, RICE_STATION, DRINKS_STATION, DIM_SUM_STATION
    estimated_prep_time = Column(Integer, default=15) # minutes
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    category = relationship("MenuCategory", back_populates="items")
    variants = relationship("MenuItemVariant", back_populates="menu_item", cascade="all, delete-orphan")
    addons = relationship("MenuAddon", secondary=menu_item_addons, back_populates="menu_items")
    recipes = relationship("Recipe", back_populates="menu_item", cascade="all, delete-orphan")

class MenuItemVariant(Base):
    __tablename__ = "menu_variants"

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False) # e.g. Regular, Large, Family
    price_adjustment = Column(Float, default=0.0) # Added or subtracted from base price

    menu_item = relationship("MenuItem", back_populates="variants")

class MenuAddon(Base):
    __tablename__ = "menu_addons"

    id = Column(Integer, primary_key=True, index=True)
    name_en = Column(String(100), nullable=False)
    name_mm = Column(String(100), nullable=False)
    price = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

    menu_items = relationship("MenuItem", secondary=menu_item_addons, back_populates="addons")

class Combo(Base):
    __tablename__ = "combos"

    id = Column(Integer, primary_key=True, index=True)
    name_en = Column(String(150), nullable=False)
    name_mm = Column(String(150), nullable=False)
    price = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)

    items = relationship("ComboItem", back_populates="combo", cascade="all, delete-orphan")

class ComboItem(Base):
    __tablename__ = "combo_items"

    id = Column(Integer, primary_key=True, index=True)
    combo_id = Column(Integer, ForeignKey("combos.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    quantity = Column(Integer, default=1)

    combo = relationship("Combo", back_populates="items")
    menu_item = relationship("MenuItem")

class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"

    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(String(20), unique=True, nullable=False, index=True)
    capacity = Column(Integer, default=4)
    status = Column(String(20), default="AVAILABLE") # AVAILABLE, OCCUPIED, RESERVED, CLEANING
    section = Column(String(50), default="Main Dining") # Main Dining, VIP Room 1, Outdoor Terrace
    current_order_id = Column(Integer, nullable=True)

    orders = relationship("Order", back_populates="table")
    reservations = relationship("Reservation", back_populates="table")

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("restaurant_tables.id"), nullable=False)
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    party_size = Column(Integer, default=2)
    reservation_time = Column(DateTime, nullable=False)
    status = Column(String(20), default="CONFIRMED") # CONFIRMED, SEATED, CANCELLED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    table = relationship("RestaurantTable", back_populates="reservations")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    table_id = Column(Integer, ForeignKey("restaurant_tables.id"), nullable=False, index=True)
    waiter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cashier_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default="PENDING") # PENDING, ACCEPTED, PREPARING, READY, SERVED, COMPLETED, CANCELLED
    payment_status = Column(String(20), default="UNPAID") # UNPAID, PARTIALLY_PAID, PAID, REFUNDED
    subtotal = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    table = relationship("RestaurantTable", back_populates="orders")
    waiter = relationship("User", foreign_keys=[waiter_id], back_populates="orders")
    cashier = relationship("User", foreign_keys=[cashier_id])
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    # Store snapshot names and unit price to preserve historical accuracy
    name_en = Column(String(150), nullable=False)
    name_mm = Column(String(150), nullable=False)
    variant_name = Column(String(50), nullable=True)
    unit_price = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    subtotal = Column(Float, nullable=False)
    special_instructions = Column(Text, nullable=True)
    station = Column(String(50), default="MAIN_KITCHEN")
    status = Column(String(20), default="PENDING") # PENDING, ACCEPTED, PREPARING, READY, SERVED

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")
    modifiers = relationship("OrderItemModifier", back_populates="order_item", cascade="all, delete-orphan")
    kitchen_tickets = relationship("KitchenTicket", back_populates="order_item", cascade="all, delete-orphan")

class OrderItemModifier(Base):
    __tablename__ = "order_item_modifiers"

    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    addon_id = Column(Integer, ForeignKey("menu_addons.id"), nullable=True)
    name = Column(String(100), nullable=False)
    price = Column(Float, default=0.0)

    order_item = relationship("OrderItem", back_populates="modifiers")

class KitchenStation(Base):
    __tablename__ = "kitchen_stations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name_en = Column(String(100), nullable=False)
    name_mm = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)

class KitchenTicket(Base):
    __tablename__ = "kitchen_tickets"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    station_code = Column(String(50), nullable=False, index=True)
    status = Column(String(20), default="PENDING") # PENDING, ACCEPTED, PREPARING, READY, SERVED
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    order_item = relationship("OrderItem", back_populates="kitchen_tickets")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    amount_paid = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False) # CASH, KPAY, WAVE_MONEY, CARD, SPLIT
    reference_no = Column(String(100), nullable=True) # Manual confirmation reference for KPay / Wave
    cash_tendered = Column(Float, default=0.0)
    change_returned = Column(Float, default=0.0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    order = relationship("Order", back_populates="payments")
    cashier = relationship("User", foreign_keys=[created_by])
    refunds = relationship("Refund", back_populates="payment")

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, nullable=False)
    reason = Column(String(255), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    payment = relationship("Payment", back_populates="refunds")
    approver = relationship("User", foreign_keys=[approved_by])

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    total_spending = Column(Float, default=0.0)
    loyalty_points = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)

    loyalty_history = relationship("LoyaltyTransaction", back_populates="customer")

class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    points = Column(Integer, nullable=False) # Positive for earned, negative for redeemed
    transaction_type = Column(String(50), default="EARNED") # EARNED, REDEEMED, ADJUSTED
    created_at = Column(DateTime, default=utc_now)

    customer = relationship("Customer", back_populates="loyalty_history")

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    name_en = Column(String(100), nullable=False, index=True)
    name_mm = Column(String(100), nullable=False)
    category = Column(String(50), default="Meat") # Meat, Vegetables, Seasoning, Dry Goods, Beverages
    unit = Column(String(20), default="kg") # kg, g, liter, pcs
    current_stock = Column(Float, default=0.0)
    minimum_stock = Column(Float, default=5.0)
    purchase_price = Column(Float, default=0.0) # per unit in MMK
    expiry_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    recipe_items = relationship("RecipeItem", back_populates="ingredient")
    transactions = relationship("InventoryTransaction", back_populates="ingredient")

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    instructions = Column(Text, nullable=True)

    menu_item = relationship("MenuItem", back_populates="recipes")
    items = relationship("RecipeItem", back_populates="recipe", cascade="all, delete-orphan")

class RecipeItem(Base):
    __tablename__ = "recipe_items"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Float, nullable=False) # e.g. 0.25 (kg)
    unit = Column(String(20), default="kg")

    recipe = relationship("Recipe", back_populates="items")
    ingredient = relationship("Ingredient", back_populates="recipe_items")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    transaction_type = Column(String(30), nullable=False) # IN, OUT, WASTAGE, ADJUSTMENT, AUTO_RECIPE_DEDUCT
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, default=0.0)
    notes = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    ingredient = relationship("Ingredient", back_populates="transactions")

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    outstanding_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    status = Column(String(20), default="DRAFT") # DRAFT, ORDERED, RECEIVED, CANCELLED
    total_amount = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    ingredient = relationship("Ingredient")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False) # Rent, Electricity, Water, Internet, Salaries, Maintenance, Transportation, Miscellaneous
    amount = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    expense_date = Column(DateTime, default=utc_now)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    recorder = relationship("User", foreign_keys=[recorded_by])

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    date = Column(DateTime, default=utc_now)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    shift = Column(String(50), default="MORNING") # MORNING, EVENING, FULL_DAY
    status = Column(String(20), default="PRESENT") # PRESENT, ABSENT, LATE, HALF_DAY

    employee = relationship("Employee", back_populates="attendances")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False) # e.g. LOGIN, CREATE_ORDER, REFUND_ISSUED, PRICE_MODIFIED
    entity = Column(String(50), nullable=True) # ORDER, PAYMENT, MENU_ITEM, USER
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=utc_now)

    user = relationship("User", foreign_keys=[user_id])

class AppSetting(Base):
    __tablename__ = "application_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
