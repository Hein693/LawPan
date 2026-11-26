import pytest
import uuid
from app.core.database import SessionLocal
from app.models.entities import Employee, Customer, User

def test_operations_staff_crm_expenses(client):
    owner_token = client.post("/api/v1/auth/login", json={"username": "owner", "password": "lawpan123"}).json()["access_token"]
    manager_token = client.post("/api/v1/auth/login", json={"username": "manager", "password": "lawpan123"}).json()["access_token"]
    
    headers_owner = {"Authorization": f"Bearer {owner_token}"}
    headers_manager = {"Authorization": f"Bearer {manager_token}"}

    uid = uuid.uuid4().hex[:6]
    emp_code = f"EMP-{uid}"
    uname = f"staff_{uid}"

    # 1. Test RBAC: Manager cannot create employee
    emp_payload = {
        "employee_code": emp_code,
        "full_name": "Ko Zaw Win",
        "phone": "+95 9 777 888 999",
        "position": "WAITER",
        "base_salary": 350000.0,
        "username": uname,
        "password": "lawpan123"
    }
    mgr_create_res = client.post("/api/v1/operations/employees", json=emp_payload, headers=headers_manager)
    assert mgr_create_res.status_code == 403

    # Owner creates employee successfully
    owner_create_res = client.post("/api/v1/operations/employees", json=emp_payload, headers=headers_owner)
    assert owner_create_res.status_code == 201
    created_emp = owner_create_res.json()
    emp_id = created_emp["id"]
    assert created_emp["base_salary"] == 350000.0

    # 2. Check salary privacy: Manager sees salary masked as 0.0, Owner sees real salary
    emp_list_mgr = client.get("/api/v1/operations/employees", headers=headers_manager).json()
    target_emp_mgr = [e for e in emp_list_mgr if e["id"] == emp_id][0]
    assert target_emp_mgr["base_salary"] == 0.0

    emp_list_owner = client.get("/api/v1/operations/employees", headers=headers_owner).json()
    target_emp_owner = [e for e in emp_list_owner if e["id"] == emp_id][0]
    assert target_emp_owner["base_salary"] == 350000.0

    # 3. Staff Attendance: Check-in and Check-out
    checkin_res = client.post("/api/v1/operations/employees/check-in", json={"employee_id": emp_id, "shift": "MORNING"}, headers=headers_manager)
    assert checkin_res.status_code == 200
    assert checkin_res.json()["status"] == "PRESENT"

    checkout_res = client.post("/api/v1/operations/employees/check-out", json={"employee_id": emp_id}, headers=headers_manager)
    assert checkout_res.status_code == 200
    assert checkout_res.json()["check_out"] is not None

    # 4. Customer CRM: Register and search
    cust_phone = f"+95 9 555 {uid}"
    cust_payload = {
        "name": f"Daw Khin {uid}",
        "phone": cust_phone,
        "email": f"khin_{uid}@gmail.com",
        "notes": "Prefers non-spicy Cantonese food and hot Chinese tea"
    }
    cust_res = client.post("/api/v1/operations/customers", json=cust_payload, headers=headers_manager)
    assert cust_res.status_code == 201
    cust = cust_res.json()
    cust_id = cust["id"]

    search_res = client.get(f"/api/v1/operations/customers?search={cust_phone}", headers=headers_manager)
    assert search_res.status_code == 200
    assert len(search_res.json()) >= 1

    # Give points and test redemption
    db = SessionLocal()
    db_cust = db.query(Customer).filter(Customer.id == cust_id).first()
    db_cust.loyalty_points = 50
    db.commit()
    db.close()

    redeem_res = client.post("/api/v1/operations/customers/loyalty/redeem", json={"customer_id": cust_id, "points_to_redeem": 20}, headers=headers_manager)
    assert redeem_res.status_code == 200
    assert redeem_res.json()["discount_amount_mmk"] == 2000.0
    assert redeem_res.json()["remaining_points"] == 30

    # 5. Operating Expenses
    expense_payload = {
        "category": "Electricity",
        "amount": 185000.0,
        "description": "Commercial Kitchen and Dining AC Bill (YESC)"
    }
    exp_res = client.post("/api/v1/operations/expenses", json=expense_payload, headers=headers_manager)
    assert exp_res.status_code == 201
    exp_data = exp_res.json()
    assert exp_data["amount"] == 185000.0

    summary_res = client.get("/api/v1/operations/expenses/summary", headers=headers_owner)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_expenses"] >= 185000.0
    assert "Electricity" in summary["by_category"]
