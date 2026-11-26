import csv
import io
from datetime import datetime, timezone, timedelta, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.api.deps import require_roles, get_current_active_user
from app.models.entities import (
    Order, OrderItem, Payment, Expense, InventoryTransaction,
    MenuCategory, MenuItem, User
)
from app.schemas.reports import (
    SalesOverviewReport, CategorySalesReport, ItemSalesReport,
    WaiterSalesReport, ProfitLossReport
)

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

def parse_date_range(start_date: Optional[str], end_date: Optional[str]):
    now = datetime.now(timezone.utc)
    if end_date:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    else:
        end_dt = now

    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=0, minute=0, second=0)
    else:
        start_dt = end_dt - timedelta(days=30)
        start_dt = start_dt.replace(hour=0, minute=0, second=0)

    return start_dt, end_dt

@router.get("/sales-overview", response_model=SalesOverviewReport)
def get_sales_overview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    start_dt, end_dt = parse_date_range(start_date, end_date)

    orders = db.query(Order).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt
    ).all()

    total_orders = len(orders)
    completed_orders = sum(1 for o in orders if o.status == "COMPLETED")
    cancelled_orders = sum(1 for o in orders if o.status == "CANCELLED")
    
    # Payments in date range
    payments = db.query(Payment).filter(
        Payment.created_at >= start_dt,
        Payment.created_at <= end_dt
    ).all()

    total_revenue = sum(p.amount_paid for p in payments)
    pm_breakdown: dict[str, float] = {}
    for p in payments:
        pm_breakdown[p.payment_method] = pm_breakdown.get(p.payment_method, 0.0) + p.amount_paid

    aov = (total_revenue / completed_orders) if completed_orders > 0 else 0.0

    return SalesOverviewReport(
        start_date=start_dt.strftime("%Y-%m-%d"),
        end_date=end_dt.strftime("%Y-%m-%d"),
        total_revenue=total_revenue,
        total_orders=total_orders,
        completed_orders=completed_orders,
        cancelled_orders=cancelled_orders,
        average_order_value=aov,
        payment_methods=pm_breakdown
    )

@router.get("/by-category", response_model=List[CategorySalesReport])
def get_sales_by_category(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    start_dt, end_dt = parse_date_range(start_date, end_date)

    categories = db.query(MenuCategory).all()
    results = []
    grand_total = 0.0

    category_stats = {}
    for cat in categories:
        category_stats[cat.id] = {
            "name": cat.name_en,
            "quantity": 0,
            "revenue": 0.0
        }

    # Query completed order items
    completed_orders = db.query(Order).filter(
        Order.status == "COMPLETED",
        Order.created_at >= start_dt,
        Order.created_at <= end_dt
    ).all()

    for o in completed_orders:
        for item in o.items:
            cat_id = item.menu_item.category_id if item.menu_item else None
            if cat_id and cat_id in category_stats:
                category_stats[cat_id]["quantity"] += item.quantity
                category_stats[cat_id]["revenue"] += item.subtotal
                grand_total += item.subtotal

    for cat_id, stats in category_stats.items():
        pct = (stats["revenue"] / grand_total * 100.0) if grand_total > 0 else 0.0
        results.append(CategorySalesReport(
            category_id=cat_id,
            category_name=stats["name"],
            total_quantity=stats["quantity"],
            total_revenue=stats["revenue"],
            percentage=round(pct, 2)
        ))

    results.sort(key=lambda x: x.total_revenue, reverse=True)
    return results

@router.get("/by-item", response_model=List[ItemSalesReport])
def get_sales_by_item(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    start_dt, end_dt = parse_date_range(start_date, end_date)

    menu_items = db.query(MenuItem).all()
    item_stats = {}
    for m in menu_items:
        item_stats[m.id] = {
            "name_en": m.name_en,
            "name_mm": m.name_mm,
            "category": m.category.name_en if m.category else "General",
            "quantity": 0,
            "revenue": 0.0
        }

    completed_orders = db.query(Order).filter(
        Order.status == "COMPLETED",
        Order.created_at >= start_dt,
        Order.created_at <= end_dt
    ).all()

    for o in completed_orders:
        for item in o.items:
            if item.menu_item_id in item_stats:
                item_stats[item.menu_item_id]["quantity"] += item.quantity
                item_stats[item.menu_item_id]["revenue"] += item.subtotal

    results = []
    for m_id, stats in item_stats.items():
        results.append(ItemSalesReport(
            menu_item_id=m_id,
            item_name_en=stats["name_en"],
            item_name_mm=stats["name_mm"],
            category=stats["category"],
            quantity_sold=stats["quantity"],
            total_revenue=stats["revenue"]
        ))

    results.sort(key=lambda x: x.quantity_sold, reverse=True)
    return results[:limit]

@router.get("/by-waiter", response_model=List[WaiterSalesReport])
def get_sales_by_waiter(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    start_dt, end_dt = parse_date_range(start_date, end_date)

    orders = db.query(Order).filter(
        Order.status == "COMPLETED",
        Order.created_at >= start_dt,
        Order.created_at <= end_dt
    ).all()

    waiter_stats = {}
    for o in orders:
        w_id = o.waiter_id
        w_name = o.waiter.username if o.waiter else "System"
        if w_id not in waiter_stats:
            waiter_stats[w_id] = {"name": w_name, "orders": 0, "sales": 0.0}
        waiter_stats[w_id]["orders"] += 1
        waiter_stats[w_id]["sales"] += o.total_amount

    results = []
    for w_id, stats in waiter_stats.items():
        results.append(WaiterSalesReport(
            waiter_id=w_id,
            waiter_name=stats["name"],
            orders_served=stats["orders"],
            total_sales=stats["sales"]
        ))
    results.sort(key=lambda x: x.total_sales, reverse=True)
    return results

@router.get("/profit-loss", response_model=ProfitLossReport)
def get_profit_loss(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER"))
):
    """
    Comprehensive P&L Statement: Gross Revenue - COGS = Gross Profit - Operating Expenses = Net Profit.
    Restricted to OWNER.
    """
    start_dt, end_dt = parse_date_range(start_date, end_date)

    # 1. Gross Revenue from Payments
    payments = db.query(Payment).filter(
        Payment.created_at >= start_dt,
        Payment.created_at <= end_dt
    ).all()
    gross_revenue = sum(p.amount_paid for p in payments)

    # 2. COGS (Cost of Goods Sold from auto recipe deductions)
    inventory_deductions = db.query(InventoryTransaction).filter(
        InventoryTransaction.transaction_type == "AUTO_RECIPE_DEDUCT",
        InventoryTransaction.created_at >= start_dt,
        InventoryTransaction.created_at <= end_dt
    ).all()
    cogs = sum(abs(tx.quantity) * tx.unit_cost for tx in inventory_deductions)

    gross_profit = gross_revenue - cogs
    gross_margin = (gross_profit / gross_revenue * 100.0) if gross_revenue > 0 else 0.0

    # 3. Operating Expenses
    expenses = db.query(Expense).filter(
        Expense.expense_date >= start_dt,
        Expense.expense_date <= end_dt
    ).all()

    total_expenses = sum(e.amount for e in expenses)
    expense_breakdown: dict[str, float] = {}
    for e in expenses:
        expense_breakdown[e.category] = expense_breakdown.get(e.category, 0.0) + e.amount

    net_profit = gross_profit - total_expenses
    net_margin = (net_profit / gross_revenue * 100.0) if gross_revenue > 0 else 0.0

    return ProfitLossReport(
        start_date=start_dt.strftime("%Y-%m-%d"),
        end_date=end_dt.strftime("%Y-%m-%d"),
        gross_revenue=gross_revenue,
        cost_of_goods_sold=cogs,
        gross_profit=gross_profit,
        gross_margin_percent=round(gross_margin, 2),
        total_operating_expenses=total_expenses,
        net_profit=net_profit,
        net_margin_percent=round(net_margin, 2),
        expense_breakdown=expense_breakdown
    )

@router.get("/export-csv")
def export_sales_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("OWNER", "MANAGER"))
):
    """
    Exports completed orders as a standard CSV spreadsheet for local download.
    """
    start_dt, end_dt = parse_date_range(start_date, end_date)

    orders = db.query(Order).filter(
        Order.status == "COMPLETED",
        Order.created_at >= start_dt,
        Order.created_at <= end_dt
    ).order_by(Order.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Order Number", "Date Time", "Table", "Waiter", "Subtotal (MMK)", "Discount (MMK)", "Total (MMK)", "Payment Status"])

    for o in orders:
        writer.writerow([
            o.order_number,
            o.created_at.strftime("%Y-%m-%d %H:%M:%S") if o.created_at else "",
            o.table.table_number if o.table else "Takeaway",
            o.waiter.username if o.waiter else "Staff",
            f"{o.subtotal:.0f}",
            f"{o.discount_amount:.0f}",
            f"{o.total_amount:.0f}",
            o.payment_status
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=lawpan_sales_{datetime.now().strftime('%Y%m%d')}.csv"}
    )
