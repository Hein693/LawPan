from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import uuid
from pathlib import Path
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.config import settings
from app.models.entities import (
    MenuCategory, MenuItem, MenuItemVariant, MenuAddon, User, AuditLog
)
from app.schemas.menu import (
    CategoryCreate, CategoryUpdate, CategoryOut,
    MenuItemCreate, MenuItemUpdate, MenuItemOut,
    AddonCreate, AddonOut, VariantCreate, VariantOut
)
from app.api.deps import get_current_active_user, require_roles

router = APIRouter(prefix="/menu", tags=["Menu & Categories"])

# ==================== CATEGORIES ====================

@router.get("/categories", response_model=List[CategoryOut])
def list_categories(
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(MenuCategory)
    if active_only:
        query = query.filter(MenuCategory.is_active == True)
    categories = query.order_by(MenuCategory.display_order.asc(), MenuCategory.id.asc()).all()

    results = []
    for cat in categories:
        items_count = db.query(MenuItem).filter(MenuItem.category_id == cat.id).count()
        results.append(CategoryOut(
            id=cat.id,
            name_en=cat.name_en,
            name_mm=cat.name_mm,
            icon=cat.icon,
            display_order=cat.display_order,
            is_active=cat.is_active,
            items_count=items_count
        ))
    return results

@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    cat = MenuCategory(
        name_en=data.name_en,
        name_mm=data.name_mm,
        icon=data.icon,
        display_order=data.display_order,
        is_active=data.is_active
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_CATEGORY",
        entity="MENU_CATEGORY",
        entity_id=str(cat.id),
        details=f"Created category {cat.name_en} ({cat.name_mm})",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()

    return CategoryOut(
        id=cat.id,
        name_en=cat.name_en,
        name_mm=cat.name_mm,
        icon=cat.icon,
        display_order=cat.display_order,
        is_active=cat.is_active,
        items_count=0
    )

@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    cat = db.query(MenuCategory).filter(MenuCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if data.name_en is not None:
        cat.name_en = data.name_en
    if data.name_mm is not None:
        cat.name_mm = data.name_mm
    if data.icon is not None:
        cat.icon = data.icon
    if data.display_order is not None:
        cat.display_order = data.display_order
    if data.is_active is not None:
        cat.is_active = data.is_active
    
    db.commit()
    db.refresh(cat)
    items_count = db.query(MenuItem).filter(MenuItem.category_id == cat.id).count()

    return CategoryOut(
        id=cat.id,
        name_en=cat.name_en,
        name_mm=cat.name_mm,
        icon=cat.icon,
        display_order=cat.display_order,
        is_active=cat.is_active,
        items_count=items_count
    )

@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    cat = db.query(MenuCategory).filter(MenuCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if category has items
    items_count = db.query(MenuItem).filter(MenuItem.category_id == cat.id).count()
    if items_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category containing {items_count} menu items. Reassign or delete items first."
        )
    
    db.delete(cat)
    db.commit()
    return {"message": "Category deleted successfully"}

# ==================== MENU ITEMS ====================

@router.get("/items", response_model=List[MenuItemOut])
def list_menu_items(
    category_id: Optional[int] = None,
    station: Optional[str] = None,
    available_only: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MenuItem)
    if category_id:
        query = query.filter(MenuItem.category_id == category_id)
    if station:
        query = query.filter(MenuItem.station == station)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (MenuItem.name_en.ilike(search_fmt)) | 
            (MenuItem.name_mm.ilike(search_fmt))
        )
    
    items = query.order_by(MenuItem.category_id.asc(), MenuItem.id.asc()).all()

    results = []
    for item in items:
        results.append(MenuItemOut(
            id=item.id,
            category_id=item.category_id,
            category_name_en=item.category.name_en if item.category else "",
            category_name_mm=item.category.name_mm if item.category else "",
            name_en=item.name_en,
            name_mm=item.name_mm,
            description_en=item.description_en,
            description_mm=item.description_mm,
            base_price=item.base_price,
            image_url=item.image_url,
            station=item.station,
            estimated_prep_time=item.estimated_prep_time,
            is_available=item.is_available,
            variants=[VariantOut(id=v.id, menu_item_id=v.menu_item_id, name=v.name, price_adjustment=v.price_adjustment) for v in item.variants],
            addons=[AddonOut(id=a.id, name_en=a.name_en, name_mm=a.name_mm, price=a.price, is_active=a.is_active) for a in item.addons],
            created_at=item.created_at
        ))
    return results

@router.get("/items/{item_id}", response_model=MenuItemOut)
def get_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    return MenuItemOut(
        id=item.id,
        category_id=item.category_id,
        category_name_en=item.category.name_en if item.category else "",
        category_name_mm=item.category.name_mm if item.category else "",
        name_en=item.name_en,
        name_mm=item.name_mm,
        description_en=item.description_en,
        description_mm=item.description_mm,
        base_price=item.base_price,
        image_url=item.image_url,
        station=item.station,
        estimated_prep_time=item.estimated_prep_time,
        is_available=item.is_available,
        variants=[VariantOut(id=v.id, menu_item_id=v.menu_item_id, name=v.name, price_adjustment=v.price_adjustment) for v in item.variants],
        addons=[AddonOut(id=a.id, name_en=a.name_en, name_mm=a.name_mm, price=a.price, is_active=a.is_active) for a in item.addons],
        created_at=item.created_at
    )

@router.post("/items", response_model=MenuItemOut, status_code=status.HTTP_201_CREATED)
def create_menu_item(
    data: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    category = db.query(MenuCategory).filter(MenuCategory.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    item = MenuItem(
        category_id=data.category_id,
        name_en=data.name_en,
        name_mm=data.name_mm,
        description_en=data.description_en,
        description_mm=data.description_mm,
        base_price=data.base_price,
        image_url=data.image_url,
        station=data.station or "MAIN_KITCHEN",
        estimated_prep_time=data.estimated_prep_time or 15,
        is_available=data.is_available if data.is_available is not None else True
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # Add variants if provided
    if data.variants:
        for v in data.variants:
            db.add(MenuItemVariant(
                menu_item_id=item.id,
                name=v.name,
                price_adjustment=v.price_adjustment
            ))
        db.commit()

    # Add addons if provided
    if data.addon_ids:
        addons = db.query(MenuAddon).filter(MenuAddon.id.in_(data.addon_ids)).all()
        item.addons = addons
        db.commit()

    db.refresh(item)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_MENU_ITEM",
        entity="MENU_ITEM",
        entity_id=str(item.id),
        details=f"Created {item.name_en} ({item.name_mm}) at {item.base_price} Ks",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()

    return MenuItemOut(
        id=item.id,
        category_id=item.category_id,
        category_name_en=category.name_en,
        category_name_mm=category.name_mm,
        name_en=item.name_en,
        name_mm=item.name_mm,
        description_en=item.description_en,
        description_mm=item.description_mm,
        base_price=item.base_price,
        image_url=item.image_url,
        station=item.station,
        estimated_prep_time=item.estimated_prep_time,
        is_available=item.is_available,
        variants=[VariantOut(id=v.id, menu_item_id=v.menu_item_id, name=v.name, price_adjustment=v.price_adjustment) for v in item.variants],
        addons=[AddonOut(id=a.id, name_en=a.name_en, name_mm=a.name_mm, price=a.price, is_active=a.is_active) for a in item.addons],
        created_at=item.created_at
    )

@router.put("/items/{item_id}", response_model=MenuItemOut)
def update_menu_item(
    item_id: int,
    data: MenuItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    if data.category_id is not None:
        cat = db.query(MenuCategory).filter(MenuCategory.id == data.category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
        item.category_id = data.category_id

    if data.name_en is not None:
        item.name_en = data.name_en
    if data.name_mm is not None:
        item.name_mm = data.name_mm
    if data.description_en is not None:
        item.description_en = data.description_en
    if data.description_mm is not None:
        item.description_mm = data.description_mm
    if data.base_price is not None:
        item.base_price = data.base_price
    if data.image_url is not None:
        item.image_url = data.image_url
    if data.station is not None:
        item.station = data.station
    if data.estimated_prep_time is not None:
        item.estimated_prep_time = data.estimated_prep_time
    if data.is_available is not None:
        item.is_available = data.is_available

    db.commit()
    db.refresh(item)

    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_MENU_ITEM",
        entity="MENU_ITEM",
        entity_id=str(item.id),
        details=f"Updated item {item.name_en} to {item.base_price} Ks",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()

    return MenuItemOut(
        id=item.id,
        category_id=item.category_id,
        category_name_en=item.category.name_en if item.category else "",
        category_name_mm=item.category.name_mm if item.category else "",
        name_en=item.name_en,
        name_mm=item.name_mm,
        description_en=item.description_en,
        description_mm=item.description_mm,
        base_price=item.base_price,
        image_url=item.image_url,
        station=item.station,
        estimated_prep_time=item.estimated_prep_time,
        is_available=item.is_available,
        variants=[VariantOut(id=v.id, menu_item_id=v.menu_item_id, name=v.name, price_adjustment=v.price_adjustment) for v in item.variants],
        addons=[AddonOut(id=a.id, name_en=a.name_en, name_mm=a.name_mm, price=a.price, is_active=a.is_active) for a in item.addons],
        created_at=item.created_at
    )

@router.patch("/items/{item_id}/availability")
def toggle_item_availability(
    item_id: int,
    available: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    item.is_available = available
    db.commit()

    return {
        "id": item.id,
        "name_en": item.name_en,
        "is_available": item.is_available,
        "message": f"Item {'marked available' if available else '86-ed / sold out'}"
    }

@router.delete("/items/{item_id}")
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    db.delete(item)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="DELETE_MENU_ITEM",
        entity="MENU_ITEM",
        entity_id=str(item_id),
        details=f"Deleted menu item ID {item_id}",
        timestamp=datetime.now(timezone.utc)
    )
    db.add(audit)
    db.commit()

    return {"message": "Menu item deleted successfully"}

# ==================== ADDONS ====================

@router.get("/addons", response_model=List[AddonOut])
def list_addons(db: Session = Depends(get_db)):
    addons = db.query(MenuAddon).filter(MenuAddon.is_active == True).all()
    return addons

@router.post("/addons", response_model=AddonOut, status_code=status.HTTP_201_CREATED)
def create_addon(
    data: AddonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    addon = MenuAddon(
        name_en=data.name_en,
        name_mm=data.name_mm,
        price=data.price,
        is_active=data.is_active
    )
    db.add(addon)
    db.commit()
    db.refresh(addon)
    return addon

# ==================== PHOTO UPLOADS ====================

@router.post("/upload-image")
async def upload_menu_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP image files are allowed")

    filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = settings.UPLOAD_DIR / filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/static/{filename}", "filename": filename}
