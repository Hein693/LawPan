from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class StationBase(BaseModel):
    code: str
    name_en: str
    name_mm: str
    is_active: Optional[bool] = True

class StationCreate(StationBase):
    pass

class StationOut(StationBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class KitchenTicketOut(BaseModel):
    id: int
    order_id: int
    order_number: Optional[str] = None
    table_number: Optional[str] = None
    waiter_name: Optional[str] = None
    order_item_id: int
    item_name_en: str
    item_name_mm: str
    quantity: int
    special_instructions: Optional[str] = None
    station_code: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    elapsed_minutes: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class TicketStatusUpdate(BaseModel):
    status: str
