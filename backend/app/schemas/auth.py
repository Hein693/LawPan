from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class LoginRequest(BaseModel):
    username: str
    password: str

class RoleSimple(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PermissionOut(BaseModel):
    id: int
    code: str
    name: str
    module: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserAuthOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    employee_id: Optional[str] = None
    is_active: bool
    permissions: List[str] = []

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserAuthOut
