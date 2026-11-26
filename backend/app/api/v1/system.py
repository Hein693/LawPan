import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import require_roles
from app.models.entities import AuditLog, AppSetting, User
from app.schemas.system import BackupOut, AuditLogOut, SystemSettingUpdate, SystemSettingsOut

router = APIRouter(prefix="/system", tags=["System Administration, Backups & Audits"])

BACKUP_DIR = Path(settings.DATA_DIR) / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/backup", response_model=BackupOut)
def create_database_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    """
    Creates an offline copy of the local SQLite database in backend/data/backups/.
    """
    db_path = Path(settings.DATA_DIR) / "lawpan.db"
    if not db_path.exists():
        # In test or dev environment, ensure file exists
        open(db_path, "a").close()

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"lawpan_backup_{timestamp_str}.db"
    dest_path = BACKUP_DIR / backup_filename

    try:
        shutil.copy2(db_path, dest_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {str(e)}")

    file_size = os.path.getsize(dest_path)

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_BACKUP",
        entity="SYSTEM",
        entity_id=backup_filename,
        details=f"Database backup created ({file_size / 1024:.1f} KB)"
    )
    db.add(audit)
    db.commit()

    return BackupOut(
        filename=backup_filename,
        size_bytes=file_size,
        created_at=datetime.now(timezone.utc).isoformat(),
        filepath=str(dest_path)
    )

@router.get("/backups", response_model=List[BackupOut])
def list_database_backups(
    current_user: User = Depends(require_roles("OWNER"))
):
    """
    Lists all available database backup files on the local disk.
    """
    results = []
    if not BACKUP_DIR.exists():
        return results

    for f in sorted(BACKUP_DIR.glob("*.db"), key=os.path.getmtime, reverse=True):
        stat = f.stat()
        results.append(BackupOut(
            filename=f.name,
            size_bytes=stat.st_size,
            created_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            filepath=str(f)
        ))
    return results

@router.post("/restore")
def restore_database_backup(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    """
    Restores the local database from an existing backup file.
    Creates a safety snapshot before restoring.
    """
    source_path = BACKUP_DIR / filename
    if not source_path.exists():
        raise HTTPException(status_code=404, detail="Backup file not found")

    db_path = Path(settings.DATA_DIR) / "lawpan.db"

    # Create safety snapshot first
    snapshot_filename = f"pre_restore_safety_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.db"
    if db_path.exists():
        shutil.copy2(db_path, BACKUP_DIR / snapshot_filename)

    # Perform restore
    try:
        shutil.copy2(source_path, db_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore database: {str(e)}")

    audit = AuditLog(
        user_id=current_user.id,
        action="RESTORE_DATABASE",
        entity="SYSTEM",
        entity_id=filename,
        details=f"Database restored from {filename}. Pre-restore safety snapshot created: {snapshot_filename}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Database successfully restored from {filename}."}

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    action: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    results = []
    for l in logs:
        results.append(AuditLogOut(
            id=l.id,
            user_id=l.user_id,
            username=l.user.username if l.user else "System",
            action=l.action,
            entity=l.entity,
            entity_id=l.entity_id,
            details=l.details,
            timestamp=l.timestamp
        ))
    return results

@router.get("/settings", response_model=SystemSettingsOut)
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    settings_records = db.query(AppSetting).all()
    result = {s.key: s.value for s in settings_records}
    return SystemSettingsOut(settings=result)

@router.put("/settings")
def update_system_setting(
    payload: SystemSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    setting = db.query(AppSetting).filter(AppSetting.key == payload.key).first()
    if not setting:
        setting = AppSetting(key=payload.key, value=payload.value, description=payload.description)
        db.add(setting)
    else:
        setting.value = payload.value
        if payload.description:
            setting.description = payload.description

    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_SETTING",
        entity="SETTING",
        entity_id=payload.key,
        details=f"Setting '{payload.key}' updated to '{payload.value}'"
    )
    db.add(audit)
    db.commit()
    return {"message": f"Setting '{payload.key}' updated successfully."}
