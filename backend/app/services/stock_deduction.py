import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models.entities import Order, Recipe, Ingredient, InventoryTransaction, AuditLog

logger = logging.getLogger("lawpan.stock_deduction")

def deduct_order_stock(db: Session, order: Order, user_id: Optional[int] = None) -> int:
    """
    Deducts raw ingredient stock for all items in an order based on associated recipes.
    Guarantees idempotency: if an order has already had AUTO_RECIPE_DEDUCT recorded,
    this function will not deduct twice.
    """
    # Check if this order was already deducted
    existing = db.query(InventoryTransaction).filter(
        InventoryTransaction.order_id == order.id,
        InventoryTransaction.transaction_type == "AUTO_RECIPE_DEDUCT"
    ).first()
    
    if existing:
        logger.info(f"Order #{order.order_number} (ID: {order.id}) already had stock deducted. Skipping to prevent duplicate.")
        return 0

    deductions_count = 0
    for order_item in order.items:
        # Check if the menu item has a recipe
        recipe = db.query(Recipe).filter(Recipe.menu_item_id == order_item.menu_item_id).first()
        if not recipe or not recipe.items:
            continue

        for recipe_item in recipe.items:
            ingredient = db.query(Ingredient).filter(Ingredient.id == recipe_item.ingredient_id).first()
            if not ingredient:
                continue

            required_qty = recipe_item.quantity * order_item.quantity
            ingredient.current_stock -= required_qty

            tx = InventoryTransaction(
                ingredient_id=ingredient.id,
                order_id=order.id,
                transaction_type="AUTO_RECIPE_DEDUCT",
                quantity=-required_qty,
                unit_cost=ingredient.purchase_price,
                notes=f"Auto recipe deduct for Order #{order.order_number} ({order_item.name_en} x{order_item.quantity})",
                created_by=user_id
            )
            db.add(tx)
            deductions_count += 1
            
            # Log warning if stock dropped below minimum
            if ingredient.current_stock <= ingredient.minimum_stock:
                logger.warning(
                    f"Low stock alert: {ingredient.name_en} ({ingredient.name_mm}) is now at "
                    f"{ingredient.current_stock:.2f} {ingredient.unit} (Minimum: {ingredient.minimum_stock:.2f})"
                )

    db.flush()
    logger.info(f"Successfully deducted stock for {deductions_count} ingredient items on Order #{order.order_number}")
    return deductions_count

def restore_order_stock(db: Session, order: Order, user_id: Optional[int] = None) -> int:
    """
    Restores stock deducted by a refunded or cancelled order.
    """
    deductions = db.query(InventoryTransaction).filter(
        InventoryTransaction.order_id == order.id,
        InventoryTransaction.transaction_type == "AUTO_RECIPE_DEDUCT"
    ).all()

    if not deductions:
        return 0

    restores_count = 0
    for tx in deductions:
        ingredient = db.query(Ingredient).filter(Ingredient.id == tx.ingredient_id).first()
        if ingredient:
            restore_qty = abs(tx.quantity)
            ingredient.current_stock += restore_qty
            
            restoration_tx = InventoryTransaction(
                ingredient_id=ingredient.id,
                order_id=order.id,
                transaction_type="ORDER_REFUND_RESTORE",
                quantity=restore_qty,
                unit_cost=ingredient.purchase_price,
                notes=f"Restored stock for Refunded Order #{order.order_number}",
                created_by=user_id
            )
            db.add(restoration_tx)
            restores_count += 1

    db.flush()
    logger.info(f"Successfully restored {restores_count} ingredient stock items for Order #{order.order_number}")
    return restores_count
