from datetime import datetime, timezone, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.websocket import manager
from app.api.deps import require_roles, get_current_active_user
from app.models.entities import (
    Order, OrderItem, RestaurantTable, Payment, Refund, User, AuditLog
)
from app.schemas.billing import (
    PaymentCreate, PaymentResponse, RefundCreate, RefundResponse,
    ReceiptResponse, ReceiptItem, CashReconciliationResponse
)
from app.services.stock_deduction import deduct_order_stock, restore_order_stock

router = APIRouter(prefix="/billing", tags=["Billing & Payments"])

@router.get("/unpaid", response_model=List[dict])
def get_unpaid_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("CASHIER", "MANAGER", "OWNER", "WAITER"))
):
    """
    Returns all active unpaid dining and takeaway orders.
    """
    unpaid_orders = db.query(Order).filter(
        Order.payment_status == "UNPAID",
        Order.status != "CANCELLED"
    ).order_by(Order.created_at.desc()).all()

    results = []
    for o in unpaid_orders:
        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "order_type": "DINE_IN" if o.table_id else "TAKEAWAY",
            "status": o.status,
            "table_id": o.table_id,
            "table_number": o.table.table_number if o.table else "Takeaway",
            "waiter_id": o.waiter_id,
            "waiter_name": o.waiter.username if o.waiter else "System",
            "total_amount": o.total_amount,
            "subtotal": o.subtotal,
            "discount_amount": o.discount_amount,
            "items_count": len(o.items),
            "created_at": o.created_at.isoformat() if o.created_at else ""
        })
    return results

@router.post("/pay", response_model=PaymentResponse)
async def process_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("CASHIER", "MANAGER", "OWNER"))
):
    """
    Processes customer payment, completes order, releases table to CLEANING,
    and automatically deducts inventory ingredients based on recipes.
    """
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.payment_status == "PAID":
        raise HTTPException(status_code=400, detail="Order has already been paid")
    
    if order.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Cannot pay for a cancelled order")

    # Calculate discount
    discount_val = 0.0
    if payload.discount_percent > 0:
        discount_val = (order.subtotal * payload.discount_percent) / 100.0
    elif payload.discount_amount > 0:
        discount_val = payload.discount_amount

    final_total = max(0.0, order.subtotal - discount_val)

    # Cash tendered and change calculation
    cash_tendered = payload.cash_tendered
    change_returned = 0.0

    if payload.payment_method == "CASH":
        if cash_tendered < final_total:
            raise HTTPException(
                status_code=400,
                detail=f"Cash tendered ({cash_tendered:,.0f} Ks) is less than total amount ({final_total:,.0f} Ks)"
            )
        change_returned = cash_tendered - final_total
    else:
        # Non-cash payments (KPay, Wave, Card)
        cash_tendered = final_total
        change_returned = 0.0

    # Create Payment record
    payment = Payment(
        order_id=order.id,
        amount_paid=final_total,
        payment_method=payload.payment_method,
        reference_no=payload.reference_no,
        cash_tendered=cash_tendered,
        change_returned=change_returned,
        created_by=current_user.id
    )
    db.add(payment)

    # Update order state
    order.discount_amount = discount_val
    order.total_amount = final_total
    order.payment_status = "PAID"
    order.status = "COMPLETED"

    # Free the table if dine-in
    if order.table:
        order.table.status = "CLEANING"
        order.table.current_order_id = None

    # Deduct raw ingredient stock based on recipes (idempotent)
    deduct_order_stock(db, order, current_user.id)

    # Create audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="PROCESS_PAYMENT",
        entity="PAYMENT",
        entity_id=str(order.id),
        details=f"Payment of {final_total:,.0f} MMK via {payload.payment_method} recorded for Order #{order.order_number}"
    )
    db.add(audit)

    db.commit()
    db.refresh(payment)

    # Broadcast WebSocket notification
    await manager.broadcast({
        "type": "ORDER_UPDATED",
        "order_id": order.id,
        "status": order.status,
        "payment_status": order.payment_status,
        "table_id": order.table_id
    })
    if order.table_id:
        await manager.broadcast({
            "type": "TABLE_STATUS_CHANGED",
            "table_id": order.table_id,
            "status": "CLEANING"
        })

    return payment

@router.post("/refund", response_model=RefundResponse)
async def process_refund(
    payload: RefundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("MANAGER", "OWNER"))
):
    """
    Authorizes and records a refund. Restricted to MANAGER or OWNER.
    Restores inventory items deducted from this order.
    """
    payment = db.query(Payment).filter(Payment.id == payload.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payload.amount > payment.amount_paid:
        raise HTTPException(
            status_code=400,
            detail=f"Refund amount ({payload.amount:,.0f} Ks) cannot exceed original paid amount ({payment.amount_paid:,.0f} Ks)"
        )

    order = payment.order
    refund = Refund(
        payment_id=payment.id,
        order_id=order.id,
        amount=payload.amount,
        reason=payload.reason,
        approved_by=current_user.id
    )
    db.add(refund)

    order.payment_status = "REFUNDED"
    order.status = "CANCELLED"

    # Restore recipe ingredient stock
    restore_order_stock(db, order, current_user.id)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="REFUND_ISSUED",
        entity="REFUND",
        entity_id=str(payment.id),
        details=f"Refund of {payload.amount:,.0f} MMK approved by {current_user.username}. Reason: {payload.reason}"
    )
    db.add(audit)

    db.commit()
    db.refresh(refund)

    await manager.broadcast({
        "type": "ORDER_UPDATED",
        "order_id": order.id,
        "status": order.status,
        "payment_status": order.payment_status
    })

    return refund

@router.get("/receipt/{order_id}", response_model=ReceiptResponse)
def get_receipt_data(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("CASHIER", "MANAGER", "OWNER", "WAITER"))
):
    """
    Returns full receipt data formatted for 80mm thermal receipt printing.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payment = db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.id.desc()).first()

    receipt_items = []
    for item in order.items:
        receipt_items.append(ReceiptItem(
            name_en=item.name_en,
            name_mm=item.name_mm,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=item.subtotal,
            modifiers=item.special_instructions
        ))

    return ReceiptResponse(
        restaurant_name="LAW PAN CHINESE RESTAURANT",
        restaurant_name_mm="လောပန် တရုတ်ရိုးရာ စားသောက်ဆိုင်",
        address="No. 88, Mahabandoola Road, Yangon, Myanmar",
        phone="+95 9 789 123 456 / +95 9 456 789 123",
        order_number=order.order_number,
        table_number=order.table.table_number if order.table else "Takeaway",
        order_type="DINE_IN" if order.table_id else "TAKEAWAY",
        cashier_name=payment.cashier.username if (payment and payment.cashier) else current_user.username,
        waiter_name=order.waiter.username if order.waiter else "Staff",
        created_at=order.created_at,
        paid_at=payment.created_at if payment else order.created_at,
        items=receipt_items,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        tax_amount=order.tax_amount,
        total_amount=order.total_amount,
        payment_method=payment.payment_method if payment else "UNPAID",
        reference_no=payment.reference_no if payment else None,
        cash_tendered=payment.cash_tendered if payment else 0.0,
        change_returned=payment.change_returned if payment else 0.0,
        footer_en="Thank you for dining with Law Pan! Please visit us again.",
        footer_mm="လောပန် စားသောက်ဆိုင်မှ ကျေးဇူးအထူးတင်ရှိပါသည်။ နောက်တစ်ကြိမ် ထပ်မံကြွရောက်ပါရန် ဖိတ်ခေါ်ပါသည်။"
    )

@router.get("/drawer-reconciliation", response_model=CashReconciliationResponse)
def get_cash_reconciliation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("CASHIER", "MANAGER", "OWNER"))
):
    """
    Returns today's cash drawer balance and mobile payment breakdowns for shift settlement.
    """
    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min)

    today_payments = db.query(Payment).filter(Payment.created_at >= today_start).all()
    today_refunds = db.query(Refund).filter(Refund.created_at >= today_start).all()

    cash_total = sum(p.amount_paid for p in today_payments if p.payment_method == "CASH")
    kpay_total = sum(p.amount_paid for p in today_payments if p.payment_method == "KPAY")
    wave_total = sum(p.amount_paid for p in today_payments if p.payment_method == "WAVE_MONEY")
    card_total = sum(p.amount_paid for p in today_payments if p.payment_method == "CARD")
    split_total = sum(p.amount_paid for p in today_payments if p.payment_method == "SPLIT")
    refund_total = sum(r.amount for r in today_refunds)

    total_gross = cash_total + kpay_total + wave_total + card_total + split_total
    net_revenue = total_gross - refund_total

    return CashReconciliationResponse(
        date=now.strftime("%Y-%m-%d"),
        cash_drawer=cash_total,
        kpay_received=kpay_total,
        wave_received=wave_total,
        card_received=card_total,
        total_received=total_gross,
        refunded_amount=refund_total,
        net_revenue=net_revenue,
        total_transactions=len(today_payments)
    )
