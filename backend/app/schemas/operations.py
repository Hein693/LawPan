from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# --- Employees ---
class EmployeeBase(BaseModel):
    employee_code: str
    full_name: str
    phone: Optional[str] = None
    position: str = "WAITER"
    base_salary: float = 0.0
    status: str = "ACTIVE"

class EmployeeCreate(EmployeeBase):
    username: Optional[str] = None
    password: Optional[str] = None
    role_name: Optional[str] = "WAITER"

class EmployeeOut(EmployeeBase):
    id: int
    user_id: Optional[int] = None
    hire_date: datetime
    model_config = ConfigDict(from_attributes=True)

class AttendanceCheckIn(BaseModel):
    employee_id: int
    shift: str = "MORNING" # MORNING, EVENING, FULL_DAY

class AttendanceCheckOut(BaseModel):
    employee_id: int

class AttendanceOut(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    position: str
    date: datetime
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    shift: str
    status: str
    model_config = ConfigDict(from_attributes=True)

# --- Customers ---
class CustomerBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    total_spending: float
    loyalty_points: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LoyaltyRedeem(BaseModel):
    customer_id: int
    points_to_redeem: int = Field(..., gt=0)

# --- Expenses ---
class ExpenseCreate(BaseModel):
    category: str = Field(..., description="Rent, Electricity, Water, Internet, Salaries, Maintenance, Transportation, Miscellaneous")
    amount: float = Field(..., gt=0.0)
    description: Optional[str] = None
    expense_date: Optional[datetime] = None

class ExpenseOut(BaseModel):
    id: int
    category: str
    amount: float
    description: Optional[str] = None
    expense_date: datetime
    recorded_by: int
    recorder_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ExpenseSummary(BaseModel):
    total_expenses: float
    by_category: dict[str, float]
