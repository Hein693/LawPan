from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class TableBase(BaseModel):
    table_number: str
    capacity: int = 4
    section: Optional[str] = "Main Dining Hall"
    status: Optional[str] = "AVAILABLE"

class TableCreate(TableBase):
    pass

class TableUpdate(BaseModel):
    table_number: Optional[str] = None
    capacity: Optional[int] = None
    section: Optional[str] = None
    status: Optional[str] = None

class TableStatusUpdate(BaseModel):
    status: str

class TableTransferRequest(BaseModel):
    from_table_id: int
    to_table_id: int

class TableMergeRequest(BaseModel):
    primary_table_id: int
    secondary_table_id: int

class TableOut(TableBase):
    id: int
    current_order_id: Optional[int] = None
    active_order_number: Optional[str] = None
    active_order_total: Optional[float] = None
    active_waiter_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ReservationBase(BaseModel):
    table_id: int
    customer_name: str
    customer_phone: str
    party_size: int = 2
    reservation_time: datetime
    notes: Optional[str] = None

class ReservationCreate(ReservationBase):
    pass

class ReservationOut(ReservationBase):
    id: int
    status: str
    table_number: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
