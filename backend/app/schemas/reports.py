from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SalesOverviewReport(BaseModel):
    start_date: str
    end_date: str
    total_revenue: float
    total_orders: int
    completed_orders: int
    cancelled_orders: int
    average_order_value: float
    payment_methods: Dict[str, float]

class CategorySalesReport(BaseModel):
    category_id: int
    category_name: str
    total_quantity: int
    total_revenue: float
    percentage: float

class ItemSalesReport(BaseModel):
    menu_item_id: int
    item_name_en: str
    item_name_mm: str
    category: str
    quantity_sold: int
    total_revenue: float

class WaiterSalesReport(BaseModel):
    waiter_id: int
    waiter_name: str
    orders_served: int
    total_sales: float

class ProfitLossReport(BaseModel):
    start_date: str
    end_date: str
    gross_revenue: float
    cost_of_goods_sold: float # COGS
    gross_profit: float
    gross_margin_percent: float
    total_operating_expenses: float
    net_profit: float
    net_margin_percent: float
    expense_breakdown: Dict[str, float]
