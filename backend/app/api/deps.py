from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.entities import User, Role, Permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username: str = payload["sub"]
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )
    return current_user

def require_roles(*allowed_roles: str):
    """
    Enforces that the authenticated user possesses one of the allowed roles.
    OWNER always has universal bypass.
    """
    def role_checker(user: User = Depends(get_current_active_user)) -> User:
        if user.role.name == "OWNER":
            return user
        if user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of the following roles: {list(allowed_roles)}. Current role is '{user.role.name}'"
            )
        return user
    return role_checker

def require_permissions(*required_permissions: str):
    """
    Enforces that the authenticated user's role has the required permission codes.
    OWNER always has universal bypass.
    """
    def permission_checker(user: User = Depends(get_current_active_user)) -> User:
        if user.role.name == "OWNER":
            return user
        
        user_permission_codes = {p.code for p in user.role.permissions}
        missing = [p for p in required_permissions if p not in user_permission_codes]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Missing permissions: {missing}"
            )
        return user
    return permission_checker
