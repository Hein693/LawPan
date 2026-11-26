from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.entities import User, Role, AuditLog
from app.schemas.auth import LoginRequest, TokenResponse, UserAuthOut, RoleSimple
from app.api.deps import get_current_active_user
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Audit log entry
    audit = AuditLog(
        user_id=user.id,
        action="LOGIN",
        entity="USER",
        entity_id=str(user.id),
        details=f"User {user.username} logged in with role {user.role.name}",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()

    permissions = [p.code for p in user.role.permissions]
    token = create_access_token(data={"sub": user.username, "role": user.role.name})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserAuthOut(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=user.role.name,
            employee_id=user.employee_id,
            is_active=user.is_active,
            permissions=permissions
        )
    )

@router.get("/me", response_model=UserAuthOut)
def get_current_user_profile(user: User = Depends(get_current_active_user)):
    permissions = [p.code for p in user.role.permissions]
    return UserAuthOut(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role.name,
        employee_id=user.employee_id,
        is_active=user.is_active,
        permissions=permissions
    )

@router.get("/roles", response_model=list[RoleSimple])
def get_all_roles(db: Session = Depends(get_db)):
    roles = db.query(Role).all()
    return roles
