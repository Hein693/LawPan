from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name_en: str
    name_mm: str
    icon: Optional[str] = "utensils"
    display_order: Optional[int] = 0
    is_active: Optional[bool] = True

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name_en: Optional[str] = None
    name_mm: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class CategoryOut(CategoryBase):
    id: int
    items_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class VariantBase(BaseModel):
    name: str
    price_adjustment: float = 0.0

class VariantCreate(VariantBase):
    pass

class VariantOut(VariantBase):
    id: int
    menu_item_id: int

    model_config = ConfigDict(from_attributes=True)

class AddonBase(BaseModel):
    name_en: str
    name_mm: str
    price: float = 0.0
    is_active: Optional[bool] = True

class AddonCreate(AddonBase):
    pass

class AddonOut(AddonBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class MenuItemBase(BaseModel):
    category_id: int
    name_en: str
    name_mm: str
    description_en: Optional[str] = None
    description_mm: Optional[str] = None
    base_price: float
    image_url: Optional[str] = None
    station: Optional[str] = "MAIN_KITCHEN"
    estimated_prep_time: Optional[int] = 15
    is_available: Optional[bool] = True

class MenuItemCreate(MenuItemBase):
    variants: Optional[List[VariantCreate]] = []
    addon_ids: Optional[List[int]] = []

class MenuItemUpdate(BaseModel):
    category_id: Optional[int] = None
    name_en: Optional[str] = None
    name_mm: Optional[str] = None
    description_en: Optional[str] = None
    description_mm: Optional[str] = None
    base_price: Optional[float] = None
    image_url: Optional[str] = None
    station: Optional[str] = None
    estimated_prep_time: Optional[int] = None
    is_available: Optional[bool] = None

class MenuItemOut(MenuItemBase):
    id: int
    category_name_en: Optional[str] = None
    category_name_mm: Optional[str] = None
    variants: List[VariantOut] = []
    addons: List[AddonOut] = []
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
