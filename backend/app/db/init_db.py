from sqlalchemy.orm import Session
from app.core.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.entities import (
    Role, Permission, User, Employee,
    MenuCategory, MenuItem, MenuItemVariant, MenuAddon,
    RestaurantTable, KitchenStation, Ingredient, Recipe, RecipeItem, AppSetting
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lawpan.init_db")

def init_database():
    logger.info("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # 1. Seed Roles
        logger.info("Seeding roles...")
        roles_data = {
            "OWNER": "Full administrative, financial and operational access",
            "MANAGER": "Operations, staffing, tables, inventory and operational reports",
            "WAITER": "Taking orders, managing table statuses, submitting to kitchen",
            "CASHIER": "Billing, processing payments, receipts, and cash reconciliation",
            "KITCHEN": "Kitchen order queue, preparation, and order fulfillment"
        }
        roles_map = {}
        for role_name, desc in roles_data.items():
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, description=desc)
                db.add(role)
                db.flush()
            roles_map[role_name] = role

        # 2. Seed Permissions
        logger.info("Seeding permissions...")
        permissions_data = [
            # Menu
            ("menu:view", "View Menu", "menu"),
            ("menu:manage", "Manage Menu Items and Categories", "menu"),
            # Tables
            ("tables:view", "View Table Status", "tables"),
            ("tables:manage", "Manage Table Floor Plan and Assignments", "tables"),
            # Orders
            ("orders:view", "View Orders", "orders"),
            ("orders:create", "Create Customer Orders", "orders"),
            ("orders:modify", "Modify Existing Orders", "orders"),
            ("orders:cancel", "Cancel Orders", "orders"),
            # Kitchen
            ("kitchen:view", "View Kitchen Orders (KDS)", "kitchen"),
            ("kitchen:update", "Update Cooking Status (Preparing/Ready/Served)", "kitchen"),
            # Billing
            ("billing:view", "View Bills and Unpaid Orders", "billing"),
            ("billing:process", "Process Payments and Issue Receipts", "billing"),
            ("billing:discount", "Apply Discounts", "billing"),
            ("billing:refund", "Issue Refunds", "billing"),
            # Inventory
            ("inventory:view", "View Ingredient Stock", "inventory"),
            ("inventory:manage", "Adjust Stock and Record Wastage", "inventory"),
            ("recipes:manage", "Configure Recipes and Ingredient Deductions", "inventory"),
            # Suppliers & Purchasing
            ("suppliers:manage", "Manage Suppliers and Purchase Orders", "purchasing"),
            # Expenses
            ("expenses:record", "Record Operating Expenses", "expenses"),
            ("expenses:view", "View Expense Reports", "expenses"),
            # Employees
            ("employees:view", "View Employee Profiles and Shifts", "employees"),
            ("employees:manage", "Manage Employees and Attendance", "employees"),
            ("employees:salary", "View and Manage Employee Salaries", "employees"),
            # Customers
            ("customers:view", "View Customer Profiles and Loyalty", "customers"),
            ("customers:manage", "Manage Customer Loyalty Points", "customers"),
            # Reports
            ("reports:view", "View Operational Sales Reports", "reports"),
            ("reports:financial", "View Confidential Financial P&L Reports", "reports"),
            ("reports:export", "Export CSV and PDF Reports", "reports"),
            # System Settings & Backups
            ("settings:manage", "Configure Restaurant Application Settings", "settings"),
            ("backups:manage", "Perform and Restore Database Backups", "settings")
        ]

        perms_map = {}
        for code, name, module in permissions_data:
            perm = db.query(Permission).filter(Permission.code == code).first()
            if not perm:
                perm = Permission(code=code, name=name, module=module)
                db.add(perm)
                db.flush()
            perms_map[code] = perm

        # Assign permissions to roles
        # OWNER gets all
        roles_map["OWNER"].permissions = list(perms_map.values())

        # MANAGER gets operational permissions
        manager_codes = [
            "menu:view", "menu:manage", "tables:view", "tables:manage",
            "orders:view", "orders:create", "orders:modify",
            "kitchen:view", "kitchen:update", "billing:view", "billing:process", "billing:discount",
            "inventory:view", "inventory:manage", "recipes:manage",
            "suppliers:manage", "expenses:record", "expenses:view",
            "employees:view", "employees:manage", "customers:view", "customers:manage",
            "reports:view", "reports:export"
        ]
        roles_map["MANAGER"].permissions = [perms_map[c] for c in manager_codes if c in perms_map]

        # WAITER gets orders, tables, kitchen view
        waiter_codes = [
            "menu:view", "tables:view", "tables:manage", "orders:view", "orders:create", "orders:modify",
            "kitchen:view"
        ]
        roles_map["WAITER"].permissions = [perms_map[c] for c in waiter_codes if c in perms_map]

        # CASHIER gets billing, payment, table view, orders view
        cashier_codes = [
            "menu:view", "tables:view", "orders:view", "billing:view", "billing:process", "billing:discount",
            "customers:view", "customers:manage"
        ]
        roles_map["CASHIER"].permissions = [perms_map[c] for c in cashier_codes if c in perms_map]

        # KITCHEN gets kitchen tickets view and update
        kitchen_codes = [
            "kitchen:view", "kitchen:update", "orders:view"
        ]
        roles_map["KITCHEN"].permissions = [perms_map[c] for c in kitchen_codes if c in perms_map]

        # 3. Seed Default Staff Accounts (password: lawpan123)
        logger.info("Seeding default staff user accounts...")
        default_users = [
            ("owner", "lawpan123", "U Kyaw (Owner)", "OWNER", "EMP-001"),
            ("manager", "lawpan123", "Daw Hlaing (General Manager)", "MANAGER", "EMP-002"),
            ("waiter", "lawpan123", "Aung Ko (Floor Waiter)", "WAITER", "EMP-003"),
            ("cashier", "lawpan123", "Su Su (Head Cashier)", "CASHIER", "EMP-004"),
            ("kitchen", "lawpan123", "Master Chef Chen (Kitchen Lead)", "KITCHEN", "EMP-005"),
        ]

        for username, password, full_name, role_name, emp_code in default_users:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                user = User(
                    username=username,
                    hashed_password=get_password_hash(password),
                    full_name=full_name,
                    role_id=roles_map[role_name].id,
                    employee_id=emp_code,
                    is_active=True
                )
                db.add(user)
                db.flush()

                # Add Employee record
                employee = db.query(Employee).filter(Employee.employee_code == emp_code).first()
                if not employee:
                    employee = Employee(
                        user_id=user.id,
                        employee_code=emp_code,
                        full_name=full_name,
                        position=role_name.capitalize(),
                        base_salary=500000.0 if role_name in ["WAITER", "CASHIER", "KITCHEN"] else 1200000.0,
                        status="ACTIVE"
                    )
                    db.add(employee)

        # 4. Seed Kitchen Stations
        logger.info("Seeding kitchen stations...")
        stations_data = [
            ("MAIN_KITCHEN", "Main Kitchen", "ပင်မမီးဖိုဆောင်"),
            ("NOODLE_STATION", "Noodle Station", "ခေါက်ဆွဲဌာန"),
            ("RICE_STATION", "Rice & Wok Station", "ထမင်းနှင့် ဒယ်အိုးဌာန"),
            ("DIM_SUM_STATION", "Dim Sum Station", "ဒင်ဆမ်းဌာန"),
            ("DRINKS_STATION", "Beverage & Bar Station", "အဖျော်ယမကာဌာန")
        ]
        for code, name_en, name_mm in stations_data:
            station = db.query(KitchenStation).filter(KitchenStation.code == code).first()
            if not station:
                station = KitchenStation(code=code, name_en=name_en, name_mm=name_mm, is_active=True)
                db.add(station)

        # 5. Seed Chinese Restaurant Menu Categories
        logger.info("Seeding Chinese menu categories...")
        categories_data = [
            ("Dim Sum", "ဒင်ဆမ်းအထူးဟင်းလျာများ", "dumpling", 1),
            ("Rice and Fried Rice", "ထမင်းကြော်နှင့် ထမင်းဟင်းလျာများ", "bowl", 2),
            ("Noodles & Soups", "ခေါက်ဆွဲနှင့် ခေါက်ဆွဲပြုတ်", "soup", 3),
            ("Chicken Dishes", "ကြက်သားဟင်းလျာများ", "utensils", 4),
            ("Beef Dishes", "အမဲသားဟင်းလျာများ", "meat", 5),
            ("Pork Dishes", "ဝက်သားဟင်းလျာများ", "pork", 6),
            ("Seafood Delicacies", "ပင်လယ်စာဟင်းလျာများ", "fish", 7),
            ("Vegetables & Tofu", "ဟင်းသီးဟင်းရွက်နှင့် ပဲပြား", "salad", 8),
            ("Hot Pot Specialties", "ဟော့ပေါ့အထူးအစီအစဉ်", "flame", 9),
            ("Chinese Appetizers & Snacks", "အကြော်အလှော်နှင့် အဆာပြေများ", "snack", 10),
            ("Beverages & Traditional Tea", "တရုတ်လက်ဖက်ရည်နှင့် အအေးစုံ", "coffee", 11),
            ("Desserts", "အချိုပွဲများ", "cake", 12),
            ("Special Family Combos", "မိသားစုတွဲဖက် အထူးဟင်းပွဲစုံ", "package", 13),
        ]

        cat_map = {}
        for name_en, name_mm, icon, order in categories_data:
            cat = db.query(MenuCategory).filter(MenuCategory.name_en == name_en).first()
            if not cat:
                cat = MenuCategory(name_en=name_en, name_mm=name_mm, icon=icon, display_order=order, is_active=True)
                db.add(cat)
                db.flush()
            cat_map[name_en] = cat

        # 6. Seed Sample Ingredients (for Inventory & Recipes)
        logger.info("Seeding raw ingredients...")
        ingredients_data = [
            ("Jasmine Rice", "စံပယ်ရနံ့ဆန်", "Dry Goods", "kg", 100.0, 20.0, 3500.0),
            ("Fresh Chicken Breast", "ကြက်ရင်အုပ်သားလတ်လတ်ဆတ်ဆတ်", "Meat", "kg", 50.0, 10.0, 9500.0),
            ("Tender Beef Flank", "နူးညံ့သောအမဲသား", "Meat", "kg", 30.0, 8.0, 18000.0),
            ("Pork Belly", "ဝက်သုံးထပ်သား", "Meat", "kg", 40.0, 10.0, 14000.0),
            ("Tiger Prawns", "ကျားပုစွန်လတ်လတ်ဆတ်ဆတ်", "Meat", "kg", 25.0, 5.0, 26000.0),
            ("Fresh Eggs", "ကြက်ဥ", "Meat", "pcs", 300.0, 50.0, 400.0),
            ("Wheat Noodles", "ဂျုံခေါက်ဆွဲ", "Dry Goods", "kg", 40.0, 10.0, 4000.0),
            ("Bok Choy", "မုံညှင်းဖြူ/စိမ်း", "Vegetables", "kg", 35.0, 10.0, 3000.0),
            ("Garlic & Ginger", "ကြက်သွန်ဖြူနှင့် ဂျင်း", "Seasoning", "kg", 20.0, 5.0, 8000.0),
            ("Sesame Oil", "နှမ်းဆီမွှေး", "Seasoning", "liter", 15.0, 3.0, 12000.0),
            ("Soy Sauce & Oyster Sauce", "ပဲငံပြာရည်နှင့် ခရုဆီ", "Seasoning", "liter", 30.0, 5.0, 6000.0),
            ("Chinese Jasmine Tea Leaves", "တရုတ်စပယ်လက်ဖက်ခြောက်", "Beverages", "kg", 15.0, 2.0, 22000.0),
        ]

        ing_map = {}
        for name_en, name_mm, cat, unit, stock, min_stock, price in ingredients_data:
            ing = db.query(Ingredient).filter(Ingredient.name_en == name_en).first()
            if not ing:
                ing = Ingredient(
                    name_en=name_en, name_mm=name_mm, category=cat, unit=unit,
                    current_stock=stock, minimum_stock=min_stock, purchase_price=price
                )
                db.add(ing)
                db.flush()
            ing_map[name_en] = ing

        # 7. Seed Authentic Chinese Menu Items
        logger.info("Seeding authentic Chinese menu items...")
        menu_items_data = [
            # Dim Sum
            (
                "Dim Sum", "Steamed Shrimp Dumplings (Har Gow)", "ပုစွန်ပေါင်းဒင်ဆမ်း (ဟာကောင်)",
                "Delicate translucent pastry filled with plump, succulent tiger shrimp and sesame oil.",
                "အသားပြည့်ဝပြီး နူးညံ့လတ်ဆတ်သော ကျားပုစွန်ပေါင်းဒင်ဆမ်း",
                8500.0, "DIM_SUM_STATION", 10
            ),
            (
                "Dim Sum", "Steamed Pork & Shrimp Siu Mai", "ဝက်သားနှင့် ပုစွန် ရှုမိုင်",
                "Classic open-topped dumplings stuffed with seasoned pork mince and shrimp.",
                "ဝက်သားနှင့် ပုစွန်ကို သဘာဝအမွှေးအကြိုင်များဖြင့် ပေါင်းထားသော ရှုမိုင်",
                7500.0, "DIM_SUM_STATION", 10
            ),
            (
                "Dim Sum", "Crispy Spring Rolls", "ကြွပ်ရွသော ကော်ပြန့်ကြော်",
                "Golden crispy rolls packed with shredded cabbage, carrots, and glass noodles.",
                "ရွှေဝါရောင် ကြွပ်ကြွပ်ရွရွ အသီးအရွက်ကော်ပြန့်ကြော်",
                5500.0, "DIM_SUM_STATION", 8
            ),
            # Rice
            (
                "Rice and Fried Rice", "Yangzhou Fried Rice", "ယန်ကျိုး ထမင်းကြော်",
                "Wok-tossed fragrant jasmine rice with BBQ pork, shrimp, fresh eggs, and scallions.",
                "ဝက်သားကင်၊ ပုစွန်နှင့် ကြက်ဥတို့ဖြင့် ဒယ်အိုးပူပူတွင် ကြော်ထားသော နာမည်ကျော် ယန်ကျိုးထမင်းကြော်",
                9500.0, "RICE_STATION", 12
            ),
            (
                "Rice and Fried Rice", "Chicken Fried Rice", "ကြက်သား ထမင်းကြော်",
                "Tender diced chicken breast stir-fried with seasonal vegetables and organic eggs.",
                "ကြက်သားလတ်လတ်ဆတ်ဆတ်နှင့် ကြက်ဥ မွှေးမွှေးကြော်",
                7500.0, "RICE_STATION", 10
            ),
            (
                "Rice and Fried Rice", "Seafood Fried Rice", "ပင်လယ်စာ ထမင်းကြော်",
                "Plump prawns, squid, and fish fillet wok-fried to smoky wok-hei perfection.",
                "ပုစွန်၊ ပြည်ကြီးငါးနှင့် ငါးအသားလွှာတို့ဖြင့် စုံလင်စွာကြော်ထားသော ပင်လယ်စာထမင်းကြော်",
                12000.0, "RICE_STATION", 12
            ),
            # Noodles
            (
                "Noodles & Soups", "Cantonese Chicken Chow Mein", "ကွမ်တုံ ကြက်သားကြော် ခေါက်ဆွဲ",
                "Crispy or soft egg noodles stir-fried with sliced chicken, bean sprouts, and scallions.",
                "ကွမ်တုံစတိုင် ကြက်သား၊ ပဲပင်ပေါက်နှင့် ဂျုံခေါက်ဆွဲကြော်",
                8000.0, "NOODLE_STATION", 12
            ),
            (
                "Noodles & Soups", "Braised Beef Noodle Soup", "အမဲသားပေါင်း ခေါက်ဆွဲပြုတ်",
                "Tender beef shank stewed in rich, aromatic five-spice broth with handmade noodles.",
                "၅ မျိုးစပ် တရုတ်ဟင်းခတ်အမွှေးအကြိုင်တို့ဖြင့် နူးအိနေအောင် ချက်ထားသော အမဲသားခေါက်ဆွဲပြုတ်",
                11000.0, "NOODLE_STATION", 15
            ),
            # Chicken
            (
                "Chicken Dishes", "Kung Pao Chicken (Gong Bao)", "ကုန်းဘောင် ကြက်သားကြော်",
                "Sichuan classic with fiery dried chilies, Sichuan peppercorns, and roasted peanuts.",
                "စီချွမ်စတိုင် မြေပဲလှော်နှင့် ငရုတ်ပွမွှေးမွှေးစပ်စပ် ကြက်သားကုန်းဘောင်ကြော်",
                10500.0, "MAIN_KITCHEN", 15
            ),
            (
                "Chicken Dishes", "Sweet and Sour Crispy Chicken", "ချိုချဉ် ကြက်သားကြွပ်ကြော်",
                "Golden battered chicken nuggets glazed in tangy homemade hawthorn sweet & sour sauce.",
                "အပြင်ကြွပ်အတွင်းနူးညံ့သော ချိုချဉ်ကြက်သားကြော်",
                9500.0, "MAIN_KITCHEN", 15
            ),
            # Beef
            (
                "Beef Dishes", "Sizzling Black Pepper Beef", "ငရုတ်ကောင်းမည်း ဒယ်ပြားပူ အမဲသား",
                "Marinated flank steak seared with bell peppers, onions, and cracked black pepper.",
                "ငရုတ်ကောင်းမည်း မွှေးမွှေးဖြင့် ဒယ်ပြားပူပူတွင် တင်ဆက်သော အမဲသားဟင်းလျာ",
                16000.0, "MAIN_KITCHEN", 18
            ),
            # Seafood
            (
                "Seafood Delicacies", "Garlic Butter Steamed Tiger Prawns", "ကြက်သွန်ဖြူထောပတ် ကျားပုစွန်ပေါင်း",
                "Butterflied jumbo prawns steamed with minced garlic, premium soy sauce, and scallions.",
                "ကြက်သွန်ဖြူနံ့သင်းပျံ့သော ကျားပုစွန်ပေါင်း",
                22000.0, "MAIN_KITCHEN", 18
            ),
            # Vegetables
            (
                "Vegetables & Tofu", "Stir-Fried Bok Choy with Garlic", "ကြက်သွန်ဖြူ မုံညှင်းစိမ်းကြော်",
                "Fresh crisp baby bok choy quickly flash-fried with crushed garlic and sesame oil.",
                "လတ်ဆတ်ကြွပ်ရွသော မုံညှင်းစိမ်း ကြက်သွန်ဖြူကြော်",
                5500.0, "MAIN_KITCHEN", 8
            ),
            # Beverages
            (
                "Beverages & Traditional Tea", "Premium Chinese Jasmine Tea Pot", "တရုတ် အထူးစပယ်လက်ဖက်ရည် (တစ်ကရား)",
                "Fragrant green tea blossoms scented with fresh jasmine flowers, served hot.",
                "မွှေးပျံ့သင်းကြိုင်သော တရုတ်ရိုးရာ စပယ်လက်ဖက်ရည်နွေးနွေး",
                3000.0, "DRINKS_STATION", 5
            ),
            (
                "Beverages & Traditional Tea", "Fresh Iced Lemon Tea", "သံပရာလက်ဖက်ရည်အေး",
                "Freshly brewed black tea sweetened with cane sugar and fresh lemon slices.",
                "သံပရာသီးလတ်လတ်ဆတ်ဆတ် လက်ဖက်ရည်အေး",
                2500.0, "DRINKS_STATION", 3
            )
        ]

        for cat_name, name_en, name_mm, desc_en, desc_mm, price, station, prep_time in menu_items_data:
            item = db.query(MenuItem).filter(MenuItem.name_en == name_en).first()
            if not item and cat_name in cat_map:
                item = MenuItem(
                    category_id=cat_map[cat_name].id,
                    name_en=name_en,
                    name_mm=name_mm,
                    description_en=desc_en,
                    description_mm=desc_mm,
                    base_price=price,
                    station=station,
                    estimated_prep_time=prep_time,
                    is_available=True
                )
                db.add(item)
                db.flush()

                # Add size variants for selected dishes
                if "Fried Rice" in name_en or "Chow Mein" in name_en:
                    db.add(MenuItemVariant(menu_item_id=item.id, name="Regular (ပုံမှန်)", price_adjustment=0.0))
                    db.add(MenuItemVariant(menu_item_id=item.id, name="Large (ပွဲကြီး)", price_adjustment=3000.0))

        # 8. Seed Sample Recipe for Chicken Fried Rice
        logger.info("Seeding sample recipe and ingredient bindings...")
        cfr_item = db.query(MenuItem).filter(MenuItem.name_en == "Chicken Fried Rice").first()
        if cfr_item:
            recipe = db.query(Recipe).filter(Recipe.menu_item_id == cfr_item.id).first()
            if not recipe:
                recipe = Recipe(
                    menu_item_id=cfr_item.id,
                    name="Standard Chicken Fried Rice Recipe",
                    instructions="Wok at high flame. Scramble egg, sear chicken, add rice, season with soy and sesame."
                )
                db.add(recipe)
                db.flush()

                # Bind ingredients: 0.25kg rice, 0.15kg chicken, 1 egg
                if "Jasmine Rice" in ing_map:
                    db.add(RecipeItem(recipe_id=recipe.id, ingredient_id=ing_map["Jasmine Rice"].id, quantity=0.25, unit="kg"))
                if "Fresh Chicken Breast" in ing_map:
                    db.add(RecipeItem(recipe_id=recipe.id, ingredient_id=ing_map["Fresh Chicken Breast"].id, quantity=0.15, unit="kg"))
                if "Fresh Eggs" in ing_map:
                    db.add(RecipeItem(recipe_id=recipe.id, ingredient_id=ing_map["Fresh Eggs"].id, quantity=1.0, unit="pcs"))

        # 9. Seed Restaurant Tables (T-01 to T-15)
        logger.info("Seeding restaurant tables floor plan...")
        table_configs = [
            ("T-01", 2, "Main Dining Hall"),
            ("T-02", 2, "Main Dining Hall"),
            ("T-03", 4, "Main Dining Hall"),
            ("T-04", 4, "Main Dining Hall"),
            ("T-05", 4, "Main Dining Hall"),
            ("T-06", 6, "Main Dining Hall"),
            ("T-07", 6, "Main Dining Hall"),
            ("T-08", 8, "Main Dining Hall (Round Table)"),
            ("T-09", 8, "Main Dining Hall (Round Table)"),
            ("VIP-01", 10, "VIP Room Dragon (နဂါးခန်း)"),
            ("VIP-02", 12, "VIP Room Phoenix (ဖီးနစ်ခန်း)"),
            ("OUT-01", 4, "Outdoor Garden Terrace"),
            ("OUT-02", 4, "Outdoor Garden Terrace"),
            ("OUT-03", 4, "Outdoor Garden Terrace"),
            ("BAR-01", 2, "Bar Counter")
        ]

        for t_num, cap, sec in table_configs:
            t = db.query(RestaurantTable).filter(RestaurantTable.table_number == t_num).first()
            if not t:
                t = RestaurantTable(
                    table_number=t_num,
                    capacity=cap,
                    status="AVAILABLE",
                    section=sec
                )
                db.add(t)

        # 10. Seed Application Settings
        logger.info("Seeding system settings...")
        settings_defaults = [
            ("restaurant_name", "LAW PAN Chinese Restaurant & Bar", "Restaurant legal business name"),
            ("currency_code", "MMK", "Operating currency code"),
            ("currency_symbol", "Ks", "Currency symbol display"),
            ("tax_percentage", "5.0", "Government commercial tax percentage"),
            ("service_charge_percentage", "5.0", "Service charge percentage"),
            ("receipt_footer_en", "Thank you for dining with LAW PAN. Please visit us again!", "Receipt English footer"),
            ("receipt_footer_mm", "လောပန်တရုတ်စားသောက်ဆိုင်သို့ ကြွရောက်အားပေးမှုအတွက် ကျေးဇူးအထူးတင်ရှိပါသည်!", "Receipt Myanmar footer"),
            ("kpay_merchant_phone", "09-798881234", "KBZPay Merchant Account Phone Number"),
            ("wave_merchant_phone", "09-971234567", "Wave Money Merchant Account Phone Number")
        ]
        for key, val, desc in settings_defaults:
            s = db.query(AppSetting).filter(AppSetting.key == key).first()
            if not s:
                s = AppSetting(key=key, value=val, description=desc)
                db.add(s)

        db.commit()
        logger.info("Database initialized and seeded successfully with zero errors!")

    except Exception as e:
        db.rollback()
        logger.error(f"Error initializing database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
