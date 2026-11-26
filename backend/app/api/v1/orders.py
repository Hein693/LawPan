from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import random
from app.core.database import get_db
from app.core.websocket import manager
from app.models.entities import (
    Order, OrderItem, OrderItemModifier, RestaurantTable, 
    MenuItem, MenuItemVariant, KitchenTicket, User, AuditLog
)
from app.schemas.order import OrderCreate, OrderOut, OrderItemOut, OrderItemModifierOut, AddItemsRequest
from app.api.deps import get_current_active_user, require_roles

router = APIRouter(prefix="/orders", tags=["Orders & POS"])

def generate_order_number(db: Session) -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    count_today = db.query(Order).filter(Order.order_number.like(f"LP-{today_str}-%")).count()
    return f"LP-{today_str}-{count_today + 1:04d}"

@router.get("", response_model=List[OrderOut])
def list_orders(
    status_filter: Optional[str] = None,
    payment_status: Optional[str] = None,
    table_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)
    if table_id:
        query = query.filter(Order.table_id == table_id)
    
    orders = query.order_by(Order.created_at.desc()).limit(limit).all()

    results = []
    for ord in orders:
        results.append(OrderOut(
            id=ord.id,
            order_number=ord.order_number,
            table_id=ord.table_id,
            table_number=ord.table.table_number if ord.table else f"Table #{ord.table_id}",
            waiter_id=ord.waiter_id,
            waiter_name=ord.waiter.full_name if ord.waiter else "Server",
            cashier_id=ord.cashier_id,
            status=ord.status,
            payment_status=ord.payment_status,
            subtotal=ord.subtotal,
            discount_amount=ord.discount_amount,
            tax_amount=ord.tax_amount,
            total_amount=ord.total_amount,
            notes=ord.notes,
            items=[
                OrderItemOut(
                    id=it.id,
                    menu_item_id=it.menu_item_id,
                    name_en=it.name_en,
                    name_mm=it.name_mm,
                    variant_name=it.variant_name,
                    unit_price=it.unit_price,
                    quantity=it.quantity,
                    subtotal=it.subtotal,
                    special_instructions=it.special_instructions,
                    station=it.station,
                    status=it.status,
                    modifiers=[
                        OrderItemModifierOut(id=m.id, addon_id=m.addon_id, name=m.name, price=m.price)
                        for m in it.modifiers
                    ]
                )
                for it in ord.items
            ],
            created_at=ord.created_at,
            updated_at=ord.updated_at
        ))
    return results

@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    ord = db.query(Order).filter(Order.id == order_id).first()
    if not ord:
        raise HTTPException(status_code=404, detail="Order not found")

    return OrderOut(
        id=ord.id,
        order_number=ord.order_number,
        table_id=ord.table_id,
        table_number=ord.table.table_number if ord.table else f"Table #{ord.table_id}",
        waiter_id=ord.waiter_id,
        waiter_name=ord.waiter.full_name if ord.waiter else "Server",
        cashier_id=ord.cashier_id,
        status=ord.status,
        payment_status=ord.payment_status,
        subtotal=ord.subtotal,
        discount_amount=ord.discount_amount,
        tax_amount=ord.tax_amount,
        total_amount=ord.total_amount,
        notes=ord.notes,
        items=[
            OrderItemOut(
                id=it.id,
                menu_item_id=it.menu_item_id,
                name_en=it.name_en,
                name_mm=it.name_mm,
                variant_name=it.variant_name,
                unit_price=it.unit_price,
                quantity=it.quantity,
                subtotal=it.subtotal,
                special_instructions=it.special_instructions,
                station=it.station,
                status=it.status,
                modifiers=[
                    OrderItemModifierOut(id=m.id, addon_id=m.addon_id, name=m.name, price=m.price)
                    for m in it.modifiers
                ]
            )
            for it in ord.items
        ],
        created_at=ord.created_at,
        updated_at=ord.updated_at
    )

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == data.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Dining table not found")

    if not data.items:
        raise HTTPException(status_code=400, detail="Order cart cannot be empty")

    order_num = generate_order_number(db)
    
    # 1. Create main Order record in transaction
    order = Order(
        order_number=order_num,
        table_id=data.table_id,
        waiter_id=current_user.id,
        status="PENDING",
        payment_status="UNPAID",
        notes=data.notes,
        discount_amount=data.discount_amount or 0.0,
        subtotal=0.0,
        tax_amount=0.0,
        total_amount=0.0
    )
    db.add(order)
    db.flush()

    total_subtotal = 0.0

    # 2. Process Order Items and Snapshot Prices
    for it in data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == it.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item ID {it.menu_item_id} not found")

        # Base snapshot unit price + variant adjustment
        effective_unit_price = menu_item.base_price + (it.variant_price_adjustment or 0.0)
        
        # Modifiers sum
        modifier_sum = sum(m.price for m in (it.modifiers or []))
        item_unit_total = effective_unit_price + modifier_sum
        item_subtotal = item_unit_total * it.quantity
        total_subtotal += item_subtotal

        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            name_en=menu_item.name_en,
            name_mm=menu_item.name_mm,
            variant_name=it.variant_name,
            unit_price=effective_unit_price,
            quantity=it.quantity,
            subtotal=item_subtotal,
            special_instructions=it.special_instructions,
            station=menu_item.station,
            status="PENDING"
        )
        db.add(order_item)
        db.flush()

        # Add item modifiers if any
        if it.modifiers:
            for m in it.modifiers:
                mod = OrderItemModifier(
                    order_item_id=order_item.id,
                    addon_id=m.addon_id,
                    name=m.name,
                    price=m.price
                )
                db.add(mod)

        # 3. Automatically generate Kitchen Ticket for this item's station
        kitchen_ticket = KitchenTicket(
            order_id=order.id,
            order_item_id=order_item.id,
            station_code=menu_item.station,
            status="PENDING"
        )
        db.add(kitchen_ticket)

    # 4. Finalize calculations (Tax: 5% Commercial Tax standard in Myanmar restaurants)
    tax_calc = total_subtotal * 0.05
    final_total = max(0.0, total_subtotal + tax_calc - (order.discount_amount or 0.0))

    order.subtotal = total_subtotal
    order.tax_amount = tax_calc
    order.total_amount = final_total

    # 5. Update Table Status to OCCUPIED and bind current_order_id
    table.status = "OCCUPIED"
    table.current_order_id = order.id

    db.commit()
    db.refresh(order)

    # 6. Real-time WebSocket Broadcast
    await manager.broadcast({
        "type": "ORDER_CREATED",
        "order_id": order.id,
        "order_number": order.order_number,
        "table_number": table.table_number,
        "total_amount": order.total_amount,
        "items_count": len(order.items)
    })

    return OrderOut(
        id=order.id,
        order_number=order.order_number,
        table_id=order.table_id,
        table_number=table.table_number,
        waiter_id=order.waiter_id,
        waiter_name=current_user.full_name,
        status=order.status,
        payment_status=order.payment_status,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        tax_amount=order.tax_amount,
        total_amount=order.total_amount,
        notes=order.notes,
        items=[
            OrderItemOut(
                id=it.id,
                menu_item_id=it.menu_item_id,
                name_en=it.name_en,
                name_mm=it.name_mm,
                variant_name=it.variant_name,
                unit_price=it.unit_price,
                quantity=it.quantity,
                subtotal=it.subtotal,
                special_instructions=it.special_instructions,
                station=it.station,
                status=it.status,
                modifiers=[
                    OrderItemModifierOut(id=m.id, addon_id=m.addon_id, name=m.name, price=m.price)
                    for m in it.modifiers
                ]
            )
            for it in order.items
        ],
        created_at=order.created_at,
        updated_at=order.updated_at
    )

@router.post("/{order_id}/items", response_model=OrderOut)
async def add_items_to_order(
    order_id: int,
    data: AddItemsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.payment_status == "PAID":
        raise HTTPException(status_code=400, detail="Cannot add items to already paid and completed order")

    added_subtotal = 0.0
    for it in data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == it.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item ID {it.menu_item_id} not found")

        effective_unit_price = menu_item.base_price + (it.variant_price_adjustment or 0.0)
        modifier_sum = sum(m.price for m in (it.modifiers or []))
        item_unit_total = effective_unit_price + modifier_sum
        item_subtotal = item_unit_total * it.quantity
        added_subtotal += item_subtotal

        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=menu_item.id,
            name_en=menu_item.name_en,
            name_mm=menu_item.name_mm,
            variant_name=it.variant_name,
            unit_price=effective_unit_price,
            quantity=it.quantity,
            subtotal=item_subtotal,
            special_instructions=it.special_instructions,
            station=menu_item.station,
            status="PENDING"
        )
        db.add(order_item)
        db.flush()

        # Add modifiers
        if it.modifiers:
            for m in it.modifiers:
                db.add(OrderItemModifier(
                    order_item_id=order_item.id,
                    addon_id=m.addon_id,
                    name=m.name,
                    price=m.price
                ))

        # Generate new Kitchen Ticket for extra dish
        db.add(KitchenTicket(
            order_id=order.id,
            order_item_id=order_item.id,
            station_code=menu_item.station,
            status="PENDING"
        ))

    # Recalculate totals
    order.subtotal += added_subtotal
    order.tax_amount = order.subtotal * 0.05
    order.total_amount = max(0.0, order.subtotal + order.tax_amount - order.discount_amount)
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)

    # Real-time WebSocket Broadcast
    await manager.broadcast({
        "type": "ORDER_UPDATED",
        "order_id": order.id,
        "order_number": order.order_number,
        "total_amount": order.total_amount
    })

    return OrderOut(
        id=order.id,
        order_number=order.order_number,
        table_id=order.table_id,
        table_number=order.table.table_number if order.table else f"Table #{order.table_id}",
        waiter_id=order.waiter_id,
        waiter_name=order.waiter.full_name if order.waiter else "Server",
        status=order.status,
        payment_status=order.payment_status,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        tax_amount=order.tax_amount,
        total_amount=order.total_amount,
        notes=order.notes,
        items=[
            OrderItemOut(
                id=it.id,
                menu_item_id=it.menu_item_id,
                name_en=it.name_en,
                name_mm=it.name_mm,
                variant_name=it.variant_name,
                unit_price=it.unit_price,
                quantity=it.quantity,
                subtotal=it.subtotal,
                special_instructions=it.special_instructions,
                station=it.station,
                status=it.status,
                modifiers=[
                    OrderItemModifierOut(id=m.id, addon_id=m.addon_id, name=m.name, price=m.price)
                    for m in it.modifiers
                ]
            )
            for it in order.items
        ],
        created_at=order.created_at,
        updated_at=order.updated_at
    )

@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status
    order.updated_at = datetime.now(timezone.utc)
    db.commit()

    await manager.broadcast({
        "type": "ORDER_STATUS_CHANGED",
        "order_id": order.id,
        "status": order.status
    })

    return {"id": order.id, "status": order.status}

@router.patch("/{order_id}/request-bill")
async def request_customer_bill(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await manager.broadcast({
        "type": "BILL_REQUESTED",
        "order_id": order.id,
        "table_number": order.table.table_number if order.table else "",
        "total_amount": order.total_amount
    })

    return {"message": "Bill request broadcast to Cashier counter"}

@router.delete("/{order_id}")
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.payment_status == "PAID":
        raise HTTPException(status_code=400, detail="Cannot cancel an already paid order. Issue an authorized refund instead.")

    order.status = "CANCELLED"
    if order.table:
        order.table.status = "AVAILABLE"
        order.table.current_order_id = None

    db.commit()

    return {"message": "Order cancelled successfully"}
