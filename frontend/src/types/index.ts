// Core Types for LAW PAN Restaurant Management System

export type UserRole = 'OWNER' | 'MANAGER' | 'WAITER' | 'CASHIER' | 'KITCHEN';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  employee_id?: string;
  is_active: boolean;
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface RestaurantTable {
  id: number;
  table_number: string;
  capacity: number;
  status: TableStatus;
  current_order_id?: number | null;
  section?: string;
}

export interface MenuCategory {
  id: number;
  name_en: string;
  name_mm: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  items_count?: number;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name_en: string;
  name_mm: string;
  description_en?: string;
  description_mm?: string;
  base_price: number;
  image_url?: string;
  station: 'MAIN_KITCHEN' | 'NOODLE_STATION' | 'RICE_STATION' | 'DRINKS_STATION' | 'DIM_SUM_STATION';
  estimated_prep_time: number; // in minutes
  is_available: boolean;
  variants?: MenuItemVariant[];
  addons?: MenuItemAddon[];
}

export interface MenuItemVariant {
  id: number;
  menu_item_id: number;
  name: string; // e.g. Small, Medium, Large
  price_adjustment: number;
}

export interface MenuItemAddon {
  id: number;
  name: string; // e.g. Extra Egg, Extra Meat
  price: number;
}

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'KPAY' | 'WAVE_MONEY' | 'CARD' | 'SPLIT';

export interface OrderItemModifier {
  addon_id?: number;
  name: string;
  price: number;
}

export interface OrderItem {
  id?: number;
  menu_item_id: number;
  name_en: string;
  name_mm: string;
  variant_name?: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  special_instructions?: string;
  station: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
  modifiers?: OrderItemModifier[];
}

export interface Order {
  id: number;
  order_number: string;
  table_id: number;
  table_number: string;
  waiter_id: number;
  waiter_name: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BillPayment {
  id: number;
  order_id: number;
  amount_paid: number;
  payment_method: PaymentMethod;
  reference_no?: string;
  cash_tendered?: number;
  change_returned?: number;
  created_at: string;
}
