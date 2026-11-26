import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Download, 
  PieChart as PieIcon, 
  BarChart3, 
  RefreshCw, 
  FileText, 
  Layers, 
  ChefHat, 
  Users,
  Percent,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface SalesOverview {
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  average_order_value: number;
  payment_methods: Record<string, number>;
}

interface CategorySale {
  category_id: number;
  category_name: string;
  total_quantity: number;
  total_revenue: number;
  percentage: number;
}

interface ItemSale {
  menu_item_id: number;
  item_name_en: string;
  item_name_mm: string;
  category: string;
  quantity_sold: number;
  total_revenue: number;
}

interface WaiterSale {
  waiter_id: number;
  waiter_name: string;
  orders_served: number;
  total_sales: number;
}

interface ProfitLoss {
  start_date: string;
  end_date: string;
  gross_revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_margin_percent: number;
  total_operating_expenses: number;
  net_profit: number;
  net_margin_percent: number;
  expense_breakdown: Record<string, number>;
}

const COLORS = ['#D97706', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#F59E0B', '#EF4444'];

export const ReportsScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const isOwner = currentUser?.role === 'OWNER';

  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState<boolean>(true);

  const [overview, setOverview] = useState<SalesOverview | null>(null);
  const [categories, setCategories] = useState<CategorySale[]>([]);
  const [topItems, setTopItems] = useState<ItemSale[]>([]);
  const [waiters, setWaiters] = useState<WaiterSale[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);

      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      const [ovRes, catRes, itemRes, wRes] = await Promise.all([
        apiRequest<SalesOverview>(`/api/v1/reports/sales-overview?start_date=${startStr}&end_date=${endStr}`),
        apiRequest<CategorySale[]>(`/api/v1/reports/by-category?start_date=${startStr}&end_date=${endStr}`),
        apiRequest<ItemSale[]>(`/api/v1/reports/by-item?start_date=${startStr}&end_date=${endStr}&limit=10`),
        apiRequest<WaiterSale[]>(`/api/v1/reports/by-waiter?start_date=${startStr}&end_date=${endStr}`)
      ]);

      setOverview(ovRes);
      setCategories(catRes);
      setTopItems(itemRes);
      setWaiters(wRes);

      if (isOwner) {
        const plRes = await apiRequest<ProfitLoss>(`/api/v1/reports/profit-loss?start_date=${startStr}&end_date=${endStr}`);
        setProfitLoss(plRes);
      }
    } catch (err) {
      console.error('Failed to load report analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMMK = (val: number) => `${Math.round(val).toLocaleString()} Ks`;

  const handleExportCSV = () => {
    window.open('/api/v1/reports/export-csv', '_blank');
  };

  const paymentData = overview?.payment_methods
    ? Object.entries(overview.payment_methods).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-500" />
            <span>Business Intelligence & Financial Reports</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Sales volume, revenue distribution, P&L statements, best-selling dishes, and staff sales rankings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Picker */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            {[
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Quarterly' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateRange(d.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  dateRange === d.id
                    ? 'bg-amber-600 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition flex items-center gap-1.5 shadow"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Gross Sales Revenue</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {formatMMK(overview?.total_revenue || 0)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">In selected date range</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Completed Orders</span>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {overview?.completed_orders || 0}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Avg Value: {formatMMK(overview?.average_order_value || 0)}</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Estimated Gross Profit</span>
          <div className="text-xl font-bold text-blue-400 mt-1">
            {formatMMK(profitLoss?.gross_profit || 0)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Margin: {profitLoss?.gross_margin_percent || 0}%</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Net Operating Profit</span>
          <div className={`text-xl font-bold mt-1 ${profitLoss && profitLoss.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatMMK(profitLoss?.net_profit || 0)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Net Margin: {profitLoss?.net_margin_percent || 0}%</span>
        </div>
      </div>

      {/* P&L Financial Statement Card (Owner Only) */}
      {isOwner && profitLoss && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <span>Executive Profit & Loss (P&L) Statement</span>
              </h3>
              <p className="text-xs text-zinc-400">Strictly confidential financial audit for restaurant ownership</p>
            </div>
            <span className="text-xs bg-zinc-800 px-2.5 py-1 rounded-lg text-zinc-300 font-mono">
              {profitLoss.start_date} → {profitLoss.end_date}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Left: Financial Statement Table */}
            <div className="space-y-2.5 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between py-1 border-b border-zinc-800">
                <span className="font-semibold text-zinc-300">1. Gross Revenue (Customer Payments):</span>
                <span className="font-bold text-emerald-400 text-sm">+{formatMMK(profitLoss.gross_revenue)}</span>
              </div>

              <div className="flex justify-between py-1 text-zinc-400">
                <span>2. Cost of Goods Sold (COGS Recipe Deductions):</span>
                <span className="font-semibold text-red-400">-{formatMMK(profitLoss.cost_of_goods_sold)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-t border-b border-zinc-800 font-bold bg-zinc-900/60 px-2 rounded">
                <span className="text-zinc-200">3. Gross Profit (Revenue - COGS):</span>
                <span className="text-blue-400">{formatMMK(profitLoss.gross_profit)} ({profitLoss.gross_margin_percent}%)</span>
              </div>

              <div className="flex justify-between py-1 text-zinc-400">
                <span>4. Operating Overhead Expenses:</span>
                <span className="font-semibold text-red-400">-{formatMMK(profitLoss.total_operating_expenses)}</span>
              </div>

              <div className="flex justify-between py-2 border-t-2 border-zinc-700 font-bold text-sm bg-zinc-900 px-2 rounded">
                <span className="text-zinc-100">5. NET OPERATING PROFIT:</span>
                <span className={profitLoss.net_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatMMK(profitLoss.net_profit)} ({profitLoss.net_margin_percent}%)
                </span>
              </div>
            </div>

            {/* Right: Overhead Cost Breakdown */}
            <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <h4 className="font-bold text-zinc-300 mb-2">Operating Expenses Breakdown:</h4>
              <div className="space-y-1.5">
                {Object.entries(profitLoss.expense_breakdown).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between text-zinc-400 py-0.5">
                    <span>{cat}:</span>
                    <span className="font-semibold text-zinc-200">{formatMMK(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Revenue Distribution Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span>Sales Revenue by Menu Category</span>
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" stroke="#71717a" fontSize={10} tickFormatter={(v) => `${v / 1000}k`} />
                <YAxis dataKey="category_name" type="category" stroke="#71717a" fontSize={10} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value: any) => [`${formatMMK(Number(value))}`, 'Revenue']}
                />
                <Bar dataKey="total_revenue" fill="#D97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            <span>Settlement Payment Channels</span>
          </h3>

          <div className="h-64 flex items-center justify-center">
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: any) => [`${formatMMK(Number(val))}`, 'Received']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-500 text-xs">No payments recorded in this period.</div>
            )}
          </div>
        </div>
      </div>

      {/* Best-Selling Dishes Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-amber-500" />
          <span>Top Best-Selling Chinese Dishes</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="py-2.5 px-3"># Rank</th>
                <th className="py-2.5 px-3">Dish (English / Burmese)</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Portions Sold</th>
                <th className="py-2.5 px-3 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {topItems.map((item, idx) => (
                <tr key={item.menu_item_id} className="hover:bg-zinc-800/40">
                  <td className="py-2.5 px-3 font-bold text-amber-400">#{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-zinc-100 block">{item.item_name_en}</span>
                    <span className="text-[10px] text-zinc-400">{item.item_name_mm}</span>
                  </td>
                  <td className="py-2.5 px-3">{item.category}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-400">{item.quantity_sold}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-zinc-100">{formatMMK(item.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
