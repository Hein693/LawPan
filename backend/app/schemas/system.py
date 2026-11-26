from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class BackupOut(BaseModel):
    filename: str
    size_bytes: int
    created_at: str
    filepath: str

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    entity: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class SystemSettingUpdate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SystemSettingsOut(BaseModel):
    settings: Dict[str, str]
