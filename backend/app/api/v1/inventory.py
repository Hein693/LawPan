from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.api.deps import require_roles, get_current_active_user
from app.models.entities import (
    Ingredient, InventoryTransaction, Recipe, RecipeItem, MenuItem,
    Supplier, PurchaseOrder, PurchaseOrderItem, User, AuditLog
)
from app.schemas.inventory import (
    IngredientCreate, IngredientUpdate, IngredientOut, StockAdjustmentCreate,
    InventoryTransactionOut, RecipeCreate, RecipeOut, RecipeItemOut,
    SupplierCreate, SupplierOut, PurchaseOrderCreate, PurchaseOrderOut, PurchaseOrderItemOut
)

router = APIRouter(prefix="/inventory", tags=["Inventory & Recipes"])

# ----------------- INGREDIENTS -----------------

@router.get("/ingredients", response_model=List[IngredientOut])
def list_ingredients(
    category: Optional[str] = None,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "KITCHEN STAFF"))
):
    query = db.query(Ingredient)
    if category:
        query = query.filter(Ingredient.category == category)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter((Ingredient.name_en.ilike(search_fmt)) | (Ingredient.name_mm.ilike(search_fmt)))
    
    ingredients = query.order_by(Ingredient.name_en.asc()).all()
    results = []
    for ing in ingredients:
        is_low = ing.current_stock <= ing.minimum_stock
        if low_stock_only and not is_low:
            continue
        results.append(IngredientOut(
            id=ing.id,
            name_en=ing.name_en,
            name_mm=ing.name_mm,
            category=ing.category,
            unit=ing.unit,
            current_stock=ing.current_stock,
            minimum_stock=ing.minimum_stock,
            purchase_price=ing.purchase_price,
            expiry_date=ing.expiry_date,
            is_low_stock=is_low,
            created_at=ing.created_at
        ))
    return results

@router.post("/ingredients", response_model=IngredientOut, status_code=status.HTTP_201_CREATED)
def create_ingredient(
    payload: IngredientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    ing = Ingredient(**payload.model_dump())
    db.add(ing)
    db.commit()
    db.refresh(ing)
    return IngredientOut(
        id=ing.id,
        name_en=ing.name_en,
        name_mm=ing.name_mm,
        category=ing.category,
        unit=ing.unit,
        current_stock=ing.current_stock,
        minimum_stock=ing.minimum_stock,
        purchase_price=ing.purchase_price,
        expiry_date=ing.expiry_date,
        is_low_stock=ing.current_stock <= ing.minimum_stock,
        created_at=ing.created_at
    )

@router.put("/ingredients/{ingredient_id}", response_model=IngredientOut)
def update_ingredient(
    ingredient_id: int,
    payload: IngredientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    ing = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(ing, field, val)
    
    db.commit()
    db.refresh(ing)
    return IngredientOut(
        id=ing.id,
        name_en=ing.name_en,
        name_mm=ing.name_mm,
        category=ing.category,
        unit=ing.unit,
        current_stock=ing.current_stock,
        minimum_stock=ing.minimum_stock,
        purchase_price=ing.purchase_price,
        expiry_date=ing.expiry_date,
        is_low_stock=ing.current_stock <= ing.minimum_stock,
        created_at=ing.created_at
    )

@router.post("/adjust")
def adjust_stock(
    payload: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "KITCHEN STAFF"))
):
    ing = db.query(Ingredient).filter(Ingredient.id == payload.ingredient_id).first()
    if not ing:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    ing.current_stock += payload.quantity
    if ing.current_stock < 0:
        ing.current_stock = 0.0

    tx = InventoryTransaction(
        ingredient_id=ing.id,
        transaction_type=payload.transaction_type,
        quantity=payload.quantity,
        unit_cost=ing.purchase_price,
        notes=payload.notes or f"Manual stock adjustment ({payload.transaction_type})",
        created_by=current_user.id
    )
    db.add(tx)
    db.commit()
    return {"message": "Stock adjusted successfully", "current_stock": ing.current_stock}

@router.get("/transactions", response_model=List[InventoryTransactionOut])
def list_transactions(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    txs = db.query(InventoryTransaction).order_by(InventoryTransaction.created_at.desc()).limit(limit).all()
    results = []
    for t in txs:
        results.append(InventoryTransactionOut(
            id=t.id,
            ingredient_id=t.ingredient_id,
            ingredient_name=t.ingredient.name_en if t.ingredient else "Unknown",
            order_id=t.order_id,
            transaction_type=t.transaction_type,
            quantity=t.quantity,
            unit_cost=t.unit_cost,
            notes=t.notes,
            created_by_name=f"User #{t.created_by}" if t.created_by else "System",
            created_at=t.created_at
        ))
    return results

@router.get("/low-stock", response_model=List[IngredientOut])
def get_low_stock_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "KITCHEN STAFF"))
):
    ingredients = db.query(Ingredient).filter(Ingredient.current_stock <= Ingredient.minimum_stock).all()
    return [
        IngredientOut(
            id=ing.id,
            name_en=ing.name_en,
            name_mm=ing.name_mm,
            category=ing.category,
            unit=ing.unit,
            current_stock=ing.current_stock,
            minimum_stock=ing.minimum_stock,
            purchase_price=ing.purchase_price,
            expiry_date=ing.expiry_date,
            is_low_stock=True,
            created_at=ing.created_at
        ) for ing in ingredients
    ]

# ----------------- RECIPES -----------------

@router.get("/recipes", response_model=List[RecipeOut])
def list_recipes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER", "KITCHEN STAFF"))
):
    recipes = db.query(Recipe).all()
    results = []
    for r in recipes:
        items = []
        for it in r.items:
            items.append(RecipeItemOut(
                id=it.id,
                ingredient_id=it.ingredient_id,
                ingredient_name_en=it.ingredient.name_en if it.ingredient else "",
                ingredient_name_mm=it.ingredient.name_mm if it.ingredient else "",
                quantity=it.quantity,
                unit=it.unit
            ))
        results.append(RecipeOut(
            id=r.id,
            menu_item_id=r.menu_item_id,
            menu_item_name=r.menu_item.name_en if r.menu_item else "",
            name=r.name,
            instructions=r.instructions,
            items=items
        ))
    return results

@router.post("/recipes", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
def create_or_update_recipe(
    payload: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    menu_item = db.query(MenuItem).filter(MenuItem.id == payload.menu_item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # If recipe exists for this menu item, update it
    recipe = db.query(Recipe).filter(Recipe.menu_item_id == payload.menu_item_id).first()
    if recipe:
        recipe.name = payload.name
        recipe.instructions = payload.instructions
        # Clear existing items
        recipe.items.clear()
    else:
        recipe = Recipe(
            menu_item_id=payload.menu_item_id,
            name=payload.name,
            instructions=payload.instructions
        )
        db.add(recipe)
        db.flush()

    for item in payload.items:
        ing = db.query(Ingredient).filter(Ingredient.id == item.ingredient_id).first()
        if not ing:
            continue
        recipe_item = RecipeItem(
            recipe_id=recipe.id,
            ingredient_id=ing.id,
            quantity=item.quantity,
            unit=item.unit or ing.unit
        )
        db.add(recipe_item)

    db.commit()
    db.refresh(recipe)

    items_out = []
    for it in recipe.items:
        items_out.append(RecipeItemOut(
            id=it.id,
            ingredient_id=it.ingredient_id,
            ingredient_name_en=it.ingredient.name_en if it.ingredient else "",
            ingredient_name_mm=it.ingredient.name_mm if it.ingredient else "",
            quantity=it.quantity,
            unit=it.unit
        ))

    return RecipeOut(
        id=recipe.id,
        menu_item_id=recipe.menu_item_id,
        menu_item_name=menu_item.name_en,
        name=recipe.name,
        instructions=recipe.instructions,
        items=items_out
    )

# ----------------- SUPPLIERS & PURCHASING -----------------

@router.get("/suppliers", response_model=List[SupplierOut])
def list_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    return db.query(Supplier).order_by(Supplier.name.asc()).all()

@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    sup = Supplier(**payload.model_dump())
    db.add(sup)
    db.commit()
    db.refresh(sup)
    return sup

@router.get("/purchase-orders", response_model=List[PurchaseOrderOut])
def list_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    pos = db.query(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).all()
    results = []
    for po in pos:
        items = []
        for it in po.items:
            items.append(PurchaseOrderItemOut(
                id=it.id,
                ingredient_id=it.ingredient_id,
                ingredient_name=it.ingredient.name_en if it.ingredient else "",
                quantity=it.quantity,
                unit_cost=it.unit_cost,
                subtotal=it.subtotal
            ))
        results.append(PurchaseOrderOut(
            id=po.id,
            po_number=po.po_number,
            supplier_id=po.supplier_id,
            supplier_name=po.supplier.name if po.supplier else "",
            status=po.status,
            total_amount=po.total_amount,
            notes=po.notes,
            created_at=po.created_at,
            items=items
        ))
    return results

@router.post("/purchase-orders", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = db.query(PurchaseOrder).count() + 1
    po_num = f"PO-{date_str}-{count:04d}"

    total_amount = sum(it.quantity * it.unit_cost for it in payload.items)

    po = PurchaseOrder(
        po_number=po_num,
        supplier_id=supplier.id,
        status="ORDERED",
        total_amount=total_amount,
        notes=payload.notes
    )
    db.add(po)
    db.flush()

    for it in payload.items:
        ing = db.query(Ingredient).filter(Ingredient.id == it.ingredient_id).first()
        if not ing:
            continue
        subtotal = it.quantity * it.unit_cost
        item = PurchaseOrderItem(
            purchase_order_id=po.id,
            ingredient_id=ing.id,
            quantity=it.quantity,
            unit_cost=it.unit_cost,
            subtotal=subtotal
        )
        db.add(item)

    db.commit()
    db.refresh(po)

    items_out = []
    for it in po.items:
        items_out.append(PurchaseOrderItemOut(
            id=it.id,
            ingredient_id=it.ingredient_id,
            ingredient_name=it.ingredient.name_en if it.ingredient else "",
            quantity=it.quantity,
            unit_cost=it.unit_cost,
            subtotal=it.subtotal
        ))

    return PurchaseOrderOut(
        id=po.id,
        po_number=po.po_number,
        supplier_id=po.supplier_id,
        supplier_name=supplier.name,
        status=po.status,
        total_amount=po.total_amount,
        notes=po.notes,
        created_at=po.created_at,
        items=items_out
    )

@router.patch("/purchase-orders/{po_id}/receive")
def receive_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    """
    Receives purchase order, increments raw ingredients stock,
    records IN transactions, and updates supplier outstanding balance.
    """
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status == "RECEIVED":
        raise HTTPException(status_code=400, detail="Purchase order has already been received")

    for item in po.items:
        ing = item.ingredient
        if ing:
            ing.current_stock += item.quantity
            ing.purchase_price = item.unit_cost

            tx = InventoryTransaction(
                ingredient_id=ing.id,
                transaction_type="IN",
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                notes=f"Goods received from {po.po_number}",
                created_by=current_user.id
            )
            db.add(tx)

    po.status = "RECEIVED"
    if po.supplier:
        po.supplier.outstanding_balance += po.total_amount

    db.commit()
    return {"message": f"Purchase order {po.po_number} received into stock successfully."}
