import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  CircleDollarSign, 
  ShoppingBag, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  UtensilsCrossed, 
  CreditCard, 
  DollarSign, 
  RefreshCw,
  Layers,
  ChefHat,
  Package,
  Users
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { apiRequest } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';

interface OwnerStats {
  today_revenue: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  estimated_gross_profit: number;
  estimated_net_profit: number;
  daily_expenses: number;
  payment_breakdown: {
    CASH: number;
    KPAY: number;
    WAVE_MONEY: number;
    CARD: number;
  };
  best_selling_food: {
    name_en: string;
    name_mm: string;
    quantity: number;
    sales: number;
  }[];
  low_stock_alerts: {
    id: number;
    name_en: string;
    name_mm: string;
    current_stock: number;
    minimum_stock: number;
    unit: string;
    category: string;
  }[];
  sales_chart: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  recent_transactions: {
    id: number;
    order_id: number;
    amount: number;
    method: string;
    reference: string;
    time: string;
  }[];
}

export const OwnerDashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const [data, setData] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const stats = await apiRequest<OwnerStats>('/api/v1/dashboard/owner');
      setData(stats);
    } catch (err) {
      console.error('Failed to fetch owner dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMMK = (val: number) => {
    return `${val.toLocaleString()} Ks`;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex items-center gap-3 text-amber-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">{t('loading')}</span>
        </div>
      </div>
    );
  }

  const stats = data!;

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-amber-400">LAW PAN</span> Business Intelligence Dashboard
          </h2>
          <p className="text-xs text-zinc-400">
            {language === 'mm'
              ? 'လုပ်ငန်းလည်ပတ်မှု၊ ဝင်ငွေ၊ အမြတ်စာရင်းနှင့် အထူးဟင်းပွဲများ အချိန်နှင့်တပြေးညီ ကြည့်ရှုခြင်း'
              : 'Real-time executive overview of restaurant revenue, profits, inventory alerts, and best-selling dishes'}
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5 shadow"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Top Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              {language === 'mm' ? 'ယနေ့ စုစုပေါင်းရောင်းရငွေ' : "Today's Revenue"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-emerald-400">{formatMMK(stats.today_revenue)}</div>
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">{stats.total_orders}</span> orders processed today
            </div>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              {language === 'mm' ? 'ခန့်မှန်း အကြမ်းဖျင်းအမြတ်' : "Est. Gross Profit (65%)"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-amber-400">{formatMMK(stats.estimated_gross_profit)}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Direct food cost deducted</div>
          </div>
        </div>

        {/* Estimated Net Profit */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              {language === 'mm' ? 'ခန့်မှန်း အသားတင်အမြတ်' : "Est. Net Profit"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-700/60 flex items-center justify-center text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-blue-400">{formatMMK(stats.estimated_net_profit)}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Expenses: {formatMMK(stats.daily_expenses)}</div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <span className="text-xs font-medium text-zinc-400 block mb-2">Order Fulfillment Status</span>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-emerald-400 block">Completed</span>
              <span className="text-base font-bold text-zinc-100">{stats.completed_orders}</span>
            </div>
            <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-amber-400 block">Pending</span>
              <span className="text-base font-bold text-zinc-100">{stats.pending_orders}</span>
            </div>
            <div className="bg-zinc-950/70 p-2 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-red-400 block">Cancelled</span>
              <span className="text-base font-bold text-zinc-100">{stats.cancelled_orders}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: 7-Day Sales Trend & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sales Area Chart */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                7-Day Revenue Trend (MMK)
              </h3>
              <p className="text-xs text-zinc-400">Weekly sales trajectory and volume</p>
            </div>
            <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.sales_chart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B91C1C" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#B91C1C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis dataKey="date" stroke="#71717A" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717A" fontSize={11} tickLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181B', borderColor: '#3F3F46', borderRadius: '8px' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} Ks`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Myanmar Payment Breakdown
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Cash, KBZPay & Wave Money reconciliation</p>

            <div className="space-y-3">
              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">Cash (ငွေသား)</span>
                  <p className="text-[11px] text-zinc-500">Physical drawer cash</p>
                </div>
                <span className="text-sm font-bold text-emerald-400">{formatMMK(stats.payment_breakdown.CASH)}</span>
              </div>

              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-400">KBZPay (KPay)</span>
                  <p className="text-[11px] text-zinc-500">Manual reference confirmed</p>
                </div>
                <span className="text-sm font-bold text-blue-400">{formatMMK(stats.payment_breakdown.KPAY)}</span>
              </div>

              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-400">Wave Money</span>
                  <p className="text-[11px] text-zinc-500">WavePay transaction records</p>
                </div>
                <span className="text-sm font-bold text-amber-400">{formatMMK(stats.payment_breakdown.WAVE_MONEY)}</span>
              </div>

              <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-300">Debit / Credit Card</span>
                  <p className="text-[11px] text-zinc-500">Card POS settlement</p>
                </div>
                <span className="text-sm font-bold text-zinc-200">{formatMMK(stats.payment_breakdown.CARD)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Total Settlement</span>
            <span className="text-sm font-bold text-amber-400">
              {formatMMK(
                stats.payment_breakdown.CASH + 
                stats.payment_breakdown.KPAY + 
                stats.payment_breakdown.WAVE_MONEY + 
                stats.payment_breakdown.CARD
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Best Sellers & Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best-Selling Chinese Dishes */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                {language === 'mm' ? 'ရောင်းအားအကောင်းဆုံး ဟင်းပွဲများ' : 'Best-Selling Chinese Dishes'}
              </h3>
              <p className="text-xs text-zinc-400">Top customer favorites ordered today</p>
            </div>
            <button 
              onClick={() => onNavigate('menu')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>Manage Menu</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {stats.best_selling_food.map((dish, idx) => (
              <div 
                key={idx}
                className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 flex items-center justify-between hover:border-zinc-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-amber-500 text-black' : idx === 1 ? 'bg-zinc-400 text-black' : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">{dish.name_en}</h4>
                    <p className="text-[11px] text-amber-400/80">{dish.name_mm}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400">{formatMMK(dish.sales)}</span>
                  <p className="text-[10px] text-zinc-500">{dish.quantity} portions sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Ingredients Alerts */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                {language === 'mm' ? 'လက်ကျန်နည်းနေသော ကုန်ကြမ်းများ' : 'Low-Stock Raw Ingredients'}
              </h3>
              <p className="text-xs text-zinc-400">Automated inventory reorder thresholds</p>
            </div>
            <button 
              onClick={() => onNavigate('inventory')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              <span>View Inventory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.low_stock_alerts.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-lg border border-zinc-800">
              <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              All ingredient stocks are currently above minimum threshold levels.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.low_stock_alerts.map((ing) => (
                <div 
                  key={ing.id}
                  className="bg-red-950/20 border border-red-900/50 p-3 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">{ing.name_en} ({ing.name_mm})</h4>
                    <span className="text-[10px] text-zinc-400">{ing.category}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-red-400">
                      {ing.current_stock} {ing.unit}
                    </span>
                    <p className="text-[10px] text-zinc-500">Min: {ing.minimum_stock} {ing.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Jump Modules (Owner 20 Core Modules) */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl">
        <h3 className="text-sm font-bold text-zinc-100 mb-3">Restaurant Management Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <button 
            onClick={() => onNavigate('menu')}
            className="p-3 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition group"
          >
            <UtensilsCrossed className="w-5 h-5 text-red-400 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-semibold text-zinc-200">Menu & Prices</h4>
            <p className="text-[10px] text-zinc-500">Chinese catalog</p>
          </button>

          <button 
            onClick={() => onNavigate('tables')}
            className="p-3 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition group"
          >
            <Layers className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-semibold text-zinc-200">Tables & Floor</h4>
            <p className="text-[10px] text-zinc-500">Seating plan</p>
          </button>

          <button 
            onClick={() => onNavigate('kitchen')}
            className="p-3 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition group"
          >
            <ChefHat className="w-5 h-5 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-semibold text-zinc-200">Kitchen KDS</h4>
            <p className="text-[10px] text-zinc-500">Station queues</p>
          </button>

          <button 
            onClick={() => onNavigate('billing')}
            className="p-3 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition group"
          >
            <CircleDollarSign className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-semibold text-zinc-200">Billing & Cash</h4>
            <p className="text-[10px] text-zinc-500">Receipts & KPay</p>
          </button>

          <button 
            onClick={() => onNavigate('inventory')}
            className="p-3 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition group"
          >
            <Package className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-semibold text-zinc-200">Inventory & Recipes</h4>
            <p className="text-[10px] text-zinc-500">Auto-deductions</p>
          </button>

          <button 
            onClick={() => onNavigate('employees')}
            className="p-3 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition group"
          >
            <Users className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="text-xs font-semibold text-zinc-200">Staff & Shifts</h4>
            <p className="text-[10px] text-zinc-500">Attendance & roles</p>
          </button>
        </div>
      </div>
    </div>
  );
};
