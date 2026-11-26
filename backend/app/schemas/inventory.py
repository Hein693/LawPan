from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# --- Ingredients ---
class IngredientBase(BaseModel):
    name_en: str = Field(..., min_length=2)
    name_mm: str = Field(..., min_length=2)
    category: str = Field(default="Meat")
    unit: str = Field(default="kg")
    current_stock: float = Field(default=0.0, ge=0.0)
    minimum_stock: float = Field(default=5.0, ge=0.0)
    purchase_price: float = Field(default=0.0, ge=0.0)
    expiry_date: Optional[datetime] = None

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name_en: Optional[str] = None
    name_mm: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    minimum_stock: Optional[float] = None
    purchase_price: Optional[float] = None
    expiry_date: Optional[datetime] = None

class IngredientOut(IngredientBase):
    id: int
    is_low_stock: bool = False
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StockAdjustmentCreate(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., description="Positive for Stock-In / receiving, negative for Wastage / Stock-Out")
    transaction_type: str = Field(..., description="IN, OUT, WASTAGE, ADJUSTMENT")
    notes: Optional[str] = None

class InventoryTransactionOut(BaseModel):
    id: int
    ingredient_id: int
    ingredient_name: str
    order_id: Optional[int] = None
    transaction_type: str
    quantity: float
    unit_cost: float
    notes: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Recipes ---
class RecipeItemCreate(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0.0)
    unit: str = "kg"

class RecipeItemOut(BaseModel):
    id: int
    ingredient_id: int
    ingredient_name_en: str
    ingredient_name_mm: str
    quantity: float
    unit: str
    model_config = ConfigDict(from_attributes=True)

class RecipeCreate(BaseModel):
    menu_item_id: int
    name: str
    instructions: Optional[str] = None
    items: List[RecipeItemCreate]

class RecipeOut(BaseModel):
    id: int
    menu_item_id: int
    menu_item_name: str
    name: str
    instructions: Optional[str] = None
    items: List[RecipeItemOut]
    model_config = ConfigDict(from_attributes=True)

# --- Suppliers ---
class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    outstanding_balance: float = 0.0

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Purchase Orders ---
class PurchaseOrderItemCreate(BaseModel):
    ingredient_id: int
    quantity: float = Field(..., gt=0.0)
    unit_cost: float = Field(..., ge=0.0)

class PurchaseOrderItemOut(BaseModel):
    id: int
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit_cost: float
    subtotal: float
    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderOut(BaseModel):
    id: int
    po_number: str
    supplier_id: int
    supplier_name: str
    status: str # DRAFT, ORDERED, RECEIVED, CANCELLED
    total_amount: float
    notes: Optional[str] = None
    created_at: datetime
    items: List[PurchaseOrderItemOut]
    model_config = ConfigDict(from_attributes=True)
