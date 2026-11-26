from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class OrderItemModifierCreate(BaseModel):
    addon_id: Optional[int] = None
    name: str
    price: float = 0.0

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = 1
    variant_name: Optional[str] = None
    variant_price_adjustment: float = 0.0
    special_instructions: Optional[str] = None
    modifiers: Optional[List[OrderItemModifierCreate]] = []

class OrderCreate(BaseModel):
    table_id: int
    items: List[OrderItemCreate]
    notes: Optional[str] = None
    discount_amount: Optional[float] = 0.0

class AddItemsRequest(BaseModel):
    items: List[OrderItemCreate]

class OrderItemModifierOut(BaseModel):
    id: int
    addon_id: Optional[int] = None
    name: str
    price: float

    model_config = ConfigDict(from_attributes=True)

class OrderItemOut(BaseModel):
    id: int
    menu_item_id: int
    name_en: str
    name_mm: str
    variant_name: Optional[str] = None
    unit_price: float
    quantity: int
    subtotal: float
    special_instructions: Optional[str] = None
    station: str
    status: str
    modifiers: List[OrderItemModifierOut] = []

    model_config = ConfigDict(from_attributes=True)

class OrderOut(BaseModel):
    id: int
    order_number: str
    table_id: int
    table_number: Optional[str] = None
    waiter_id: int
    waiter_name: Optional[str] = None
    cashier_id: Optional[int] = None
    status: str
    payment_status: str
    subtotal: float
    discount_amount: float
    tax_amount: float
    total_amount: float
    notes: Optional[str] = None
    items: List[OrderItemOut] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
