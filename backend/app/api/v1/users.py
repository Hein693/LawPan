from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.entities import User, Role, AuditLog
from app.schemas.user import UserCreate, UserUpdate, UserOut
from app.api.deps import get_current_active_user, require_roles
from datetime import datetime

router = APIRouter(prefix="/users", tags=["Users Management"])

@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    users = db.query(User).all()
    results = []
    for u in users:
        results.append(UserOut(
            id=u.id,
            username=u.username,
            full_name=u.full_name,
            role_id=u.role_id,
            role_name=u.role.name if u.role else None,
            employee_id=u.employee_id,
            is_active=u.is_active,
            created_at=u.created_at
        ))
    return results

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Manager cannot create Owner accounts
    if current_user.role.name == "MANAGER" and role.name == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers cannot create Owner accounts"
        )
    
    user = User(
        username=data.username,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role_id=data.role_id,
        employee_id=data.employee_id,
        is_active=data.is_active if data.is_active is not None else True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_USER",
        entity="USER",
        entity_id=str(user.id),
        details=f"Created user {user.username} with role {role.name}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return UserOut(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role_id=user.role_id,
        role_name=role.name,
        employee_id=user.employee_id,
        is_active=user.is_active,
        created_at=user.created_at
    )
