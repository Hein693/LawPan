from datetime import datetime, timezone, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.deps import require_roles, get_current_active_user
from app.models.entities import (
    Employee, Attendance, Customer, LoyaltyTransaction, Expense, User, Role, AuditLog
)
from app.schemas.operations import (
    EmployeeCreate, EmployeeOut, AttendanceCheckIn, AttendanceCheckOut, AttendanceOut,
    CustomerCreate, CustomerOut, LoyaltyRedeem, ExpenseCreate, ExpenseOut, ExpenseSummary
)

router = APIRouter(prefix="/operations", tags=["Operations, Staff, CRM & Expenses"])

# ==================== EMPLOYEES & ATTENDANCE ====================

@router.get("/employees", response_model=List[EmployeeOut])
def list_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    employees = db.query(Employee).order_by(Employee.full_name.asc()).all()
    results = []
    is_owner = current_user.role.name == "OWNER"

    for emp in employees:
        # Hide sensitive salary from managers if not owner
        display_salary = emp.base_salary if is_owner else 0.0
        results.append(EmployeeOut(
            id=emp.id,
            user_id=emp.user_id,
            employee_code=emp.employee_code,
            full_name=emp.full_name,
            phone=emp.phone,
            position=emp.position,
            base_salary=display_salary,
            status=emp.status,
            hire_date=emp.hire_date
        ))
    return results

@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    existing = db.query(Employee).filter(Employee.employee_code == payload.employee_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Employee code '{payload.employee_code}' already registered")

    user_id = None
    if payload.username and payload.password:
        existing_user = db.query(User).filter(User.username == payload.username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail=f"Username '{payload.username}' already taken")
        
        role = db.query(Role).filter(Role.name == payload.role_name).first()
        if not role:
            role = db.query(Role).filter(Role.name == "WAITER").first()

        new_user = User(
            username=payload.username,
            hashed_password=get_password_hash(payload.password),
            full_name=payload.full_name,
            role_id=role.id,
            employee_id=payload.employee_code,
            is_active=True
        )
        db.add(new_user)
        db.flush()
        user_id = new_user.id

    emp = Employee(
        user_id=user_id,
        employee_code=payload.employee_code,
        full_name=payload.full_name,
        phone=payload.phone,
        position=payload.position,
        base_salary=payload.base_salary,
        status=payload.status
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

@router.post("/employees/check-in", response_model=AttendanceOut)
def attendance_check_in(
    payload: AttendanceCheckIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "WAITER", "CASHIER", "KITCHEN STAFF"))
):
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min)

    existing = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date >= today_start
    ).first()

    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail=f"{emp.full_name} has already checked in today at {existing.check_in.strftime('%H:%M')}")

    if not existing:
        existing = Attendance(
            employee_id=emp.id,
            date=now,
            check_in=now,
            shift=payload.shift,
            status="PRESENT"
        )
        db.add(existing)
    else:
        existing.check_in = now
        existing.shift = payload.shift
        existing.status = "PRESENT"

    db.commit()
    db.refresh(existing)
    return AttendanceOut(
        id=existing.id,
        employee_id=emp.id,
        employee_name=emp.full_name,
        position=emp.position,
        date=existing.date,
        check_in=existing.check_in,
        check_out=existing.check_out,
        shift=existing.shift,
        status=existing.status
    )

@router.post("/employees/check-out", response_model=AttendanceOut)
def attendance_check_out(
    payload: AttendanceCheckOut,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "WAITER", "CASHIER", "KITCHEN STAFF"))
):
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min)

    att = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date >= today_start
    ).first()

    if not att or not att.check_in:
        raise HTTPException(status_code=400, detail=f"{emp.full_name} has not checked in today yet")

    att.check_out = now
    db.commit()
    db.refresh(att)
    return AttendanceOut(
        id=att.id,
        employee_id=emp.id,
        employee_name=emp.full_name,
        position=emp.position,
        date=att.date,
        check_in=att.check_in,
        check_out=att.check_out,
        shift=att.shift,
        status=att.status
    )

@router.get("/employees/attendance/today", response_model=List[AttendanceOut])
def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min)

    records = db.query(Attendance).filter(Attendance.date >= today_start).all()
    results = []
    for r in records:
        results.append(AttendanceOut(
            id=r.id,
            employee_id=r.employee_id,
            employee_name=r.employee.full_name if r.employee else "Unknown",
            position=r.employee.position if r.employee else "",
            date=r.date,
            check_in=r.check_in,
            check_out=r.check_out,
            shift=r.shift,
            status=r.status
        ))
    return results

# ==================== CUSTOMERS & LOYALTY ====================

@router.get("/customers", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "CASHIER", "WAITER"))
):
    query = db.query(Customer)
    if search:
        search_term = search.strip()
        search_fmt = f"%{search_term}%"
        query = query.filter((Customer.name.ilike(search_fmt)) | (Customer.phone.ilike(search_fmt)))
    return query.order_by(Customer.total_spending.desc()).all()

@router.post("/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "CASHIER", "WAITER"))
):
    existing = db.query(Customer).filter(Customer.phone == payload.phone).first()
    if existing:
        return existing

    cust = Customer(**payload.model_dump())
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return cust

@router.post("/customers/loyalty/redeem")
def redeem_loyalty_points(
    payload: LoyaltyRedeem,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("CASHIER", "MANAGER", "OWNER"))
):
    """
    Redeems loyalty points for instant bill discount (e.g. 1 point = 100 MMK discount).
    """
    cust = db.query(Customer).filter(Customer.id == payload.customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    if cust.loyalty_points < payload.points_to_redeem:
        raise HTTPException(
            status_code=400,
            detail=f"Customer only has {cust.loyalty_points} loyalty points (requested {payload.points_to_redeem})"
        )

    cust.loyalty_points -= payload.points_to_redeem
    discount_equivalent = payload.points_to_redeem * 100.0 # 1 point = 100 MMK

    tx = LoyaltyTransaction(
        customer_id=cust.id,
        points=-payload.points_to_redeem,
        transaction_type="REDEEMED"
    )
    db.add(tx)
    db.commit()

    return {
        "message": f"Successfully redeemed {payload.points_to_redeem} points.",
        "discount_amount_mmk": discount_equivalent,
        "remaining_points": cust.loyalty_points
    }

# ==================== OPERATING EXPENSES ====================

@router.get("/expenses", response_model=List[ExpenseOut])
def list_expenses(
    category: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    query = db.query(Expense)
    if category:
        query = query.filter(Expense.category == category)
    
    expenses = query.order_by(Expense.expense_date.desc()).limit(limit).all()
    results = []
    for exp in expenses:
        results.append(ExpenseOut(
            id=exp.id,
            category=exp.category,
            amount=exp.amount,
            description=exp.description,
            expense_date=exp.expense_date,
            recorded_by=exp.recorded_by,
            recorder_name=exp.recorder.username if exp.recorder else "Staff",
            created_at=exp.created_at
        ))
    return results

@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def record_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    exp_date = payload.expense_date or datetime.now(timezone.utc)
    exp = Expense(
        category=payload.category,
        amount=payload.amount,
        description=payload.description,
        expense_date=exp_date,
        recorded_by=current_user.id
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    return ExpenseOut(
        id=exp.id,
        category=exp.category,
        amount=exp.amount,
        description=exp.description,
        expense_date=exp.expense_date,
        recorded_by=exp.recorded_by,
        recorder_name=current_user.username,
        created_at=exp.created_at
    )

@router.get("/expenses/summary", response_model=ExpenseSummary)
def get_expense_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    expenses = db.query(Expense).all()
    by_category: dict[str, float] = {}
    total = 0.0

    for exp in expenses:
        by_category[exp.category] = by_category.get(exp.category, 0.0) + exp.amount
        total += exp.amount

    return ExpenseSummary(
        total_expenses=total,
        by_category=by_category
    )
