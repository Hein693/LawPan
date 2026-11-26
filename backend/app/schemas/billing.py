from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class PaymentCreate(BaseModel):
    order_id: int
    payment_method: str = Field(..., description="CASH, KPAY, WAVE_MONEY, CARD, SPLIT")
    cash_tendered: float = Field(default=0.0, ge=0.0)
    reference_no: Optional[str] = Field(default=None, description="Manual reference/transaction ID for mobile wallet")
    discount_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    discount_amount: float = Field(default=0.0, ge=0.0)

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    amount_paid: float
    payment_method: str
    reference_no: Optional[str] = None
    cash_tendered: float
    change_returned: float
    created_by: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RefundCreate(BaseModel):
    payment_id: int
    amount: float = Field(..., gt=0.0)
    reason: str = Field(..., min_length=3)
    manager_pin: Optional[str] = None

class RefundResponse(BaseModel):
    id: int
    payment_id: int
    order_id: int
    amount: float
    reason: str
    approved_by: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ReceiptItem(BaseModel):
    name_en: str
    name_mm: str
    quantity: int
    unit_price: float
    subtotal: float
    modifiers: Optional[str] = None

class ReceiptResponse(BaseModel):
    restaurant_name: str
    restaurant_name_mm: str
    address: str
    phone: str
    order_number: str
    table_number: str
    order_type: str
    cashier_name: str
    waiter_name: str
    created_at: datetime
    paid_at: datetime
    items: List[ReceiptItem]
    subtotal: float
    discount_amount: float
    tax_amount: float
    total_amount: float
    payment_method: str
    reference_no: Optional[str] = None
    cash_tendered: float
    change_returned: float
    footer_en: str
    footer_mm: str

class CashReconciliationResponse(BaseModel):
    date: str
    cash_drawer: float
    kpay_received: float
    wave_received: float
    card_received: float
    total_received: float
    refunded_amount: float
    net_revenue: float
    total_transactions: int
