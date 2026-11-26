from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    full_name: str
    role_id: int
    employee_id: Optional[str] = None
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role_id: int
    role_name: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
