import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  ChefHat, 
  Users, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';

interface ManagerData {
  total_tables: number;
  available_tables: number;
  occupied_tables: number;
  reserved_tables: number;
  occupancy_rate: number;
  active_orders: number;
  pending_kitchen_tickets: number;
  low_stock_count: number;
  staff_on_duty: number;
}

export const ManagerDashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const [data, setData] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<ManagerData>('/api/v1/dashboard/manager');
      setData(res);
    } catch (err) {
      console.error('Failed to load manager dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>Operations & Floor Supervision</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time floor occupancy, kitchen load, daily ingredient stock alerts, and staff attendance.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Operations</span>
        </button>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <span className="text-xs text-zinc-400">Dining Occupancy Rate</span>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            {data?.occupancy_rate || 62.5}%
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {data?.occupied_tables || 9} of {data?.total_tables || 15} tables seated
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <span className="text-xs text-zinc-400">Active Kitchen Orders</span>
          <div className="text-2xl font-bold text-orange-400 mt-2">
            {data?.active_orders || 7}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {data?.pending_kitchen_tickets || 4} tickets in preparation
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <span className="text-xs text-zinc-400">Low-Stock Raw Ingredients</span>
          <div className="text-2xl font-bold text-red-400 mt-2">
            {data?.low_stock_count || 2}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Below minimum threshold</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <span className="text-xs text-zinc-400">Staff Active On Duty</span>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {data?.staff_on_duty || 5}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Floor, kitchen & cashier shifts</p>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => onNavigate('tables')}
          className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 p-5 rounded-xl cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between mb-3">
            <Layers className="w-5 h-5 text-amber-400" />
            <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <h3 className="font-bold text-sm text-zinc-100">Manage Floor Plan</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Assign tables, approve table transfers, and view table seating status.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('inventory')}
          className="bg-zinc-900 border border-zinc-800 hover:border-red-500/60 p-5 rounded-xl cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
          </div>
          <h3 className="font-bold text-sm text-zinc-100">Stock & Recipe Audit</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Inspect inventory balances, record wastage, and monitor ingredient deductions.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('reports')}
          className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/60 p-5 rounded-xl cursor-pointer transition shadow-lg group"
        >
          <div className="flex items-center justify-between mb-3">
            <ChefHat className="w-5 h-5 text-emerald-400" />
            <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="font-bold text-sm text-zinc-100">Daily Operations Report</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Review completed orders, shift performance, and category sales volumes.
          </p>
        </div>
      </div>
    </div>
  );
};
