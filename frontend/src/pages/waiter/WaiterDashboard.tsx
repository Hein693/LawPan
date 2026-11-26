import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  UtensilsCrossed, 
  PlusCircle, 
  FileText, 
  Clock, 
  Users, 
  RefreshCw, 
  Search, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { TableStatus } from '../../types';

interface WaiterData {
  tables: {
    id: number;
    table_number: string;
    capacity: number;
    status: TableStatus;
    section: string;
    current_order_id?: number;
  }[];
  active_orders: {
    id: number;
    order_number: string;
    table_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    items_count: number;
    created_at: string;
  }[];
  waiter_name: string;
}

export const WaiterDashboard: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const [data, setData] = useState<WaiterData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  useEffect(() => {
    fetchWaiterData();
  }, []);

  const fetchWaiterData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<WaiterData>('/api/v1/dashboard/waiter');
      setData(res);
    } catch (err) {
      console.error('Failed to load waiter dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<TableStatus, { bg: string; text: string; border: string }> = {
    AVAILABLE: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-700/60' },
    OCCUPIED: { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-700/60' },
    RESERVED: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-700/60' },
    CLEANING: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-700/60' },
  };

  const filteredTables = data?.tables.filter(t => {
    if (selectedSection === 'ALL') return true;
    return t.section.toLowerCase().includes(selectedSection.toLowerCase());
  }) || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
            <span>Waiter Touch Floor Plan</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Assigned Waiter: <strong className="text-amber-400">{currentUser?.name}</strong> • Quick touch order taking and table management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('orders')}
            className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Order / Menu</span>
          </button>

          <button
            onClick={fetchWaiterData}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'Main Dining', 'VIP Room', 'Outdoor', 'Bar'].map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              selectedSection === sec
                ? 'bg-amber-600 text-black font-bold shadow'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {sec === 'ALL' ? 'All Dining Sections' : sec}
          </button>
        ))}
      </div>

      {/* Dining Tables Floor Plan Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filteredTables.map((table) => {
          const style = statusColors[table.status];
          const isSelected = selectedTable?.id === table.id;

          return (
            <div
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative ${style.bg} ${style.border} ${
                isSelected ? 'ring-2 ring-amber-400 shadow-xl scale-[1.02]' : 'hover:scale-[1.01]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-zinc-100">{table.table_number}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${style.text} ${style.border}`}>
                  {table.status}
                </span>
              </div>

              <div className="mt-3 text-xs text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Seats {table.capacity} guests</span>
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{table.section}</div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('orders');
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold"
                >
                  {table.status === 'AVAILABLE' ? '+ Take Order' : 'View Order'}
                </button>
                {table.status === 'OCCUPIED' && (
                  <span className="text-red-400 text-[10px] animate-pulse font-medium">Active</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Orders List */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl">
        <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Active Dining Room Orders
        </h3>

        {data?.active_orders && data.active_orders.length > 0 ? (
          <div className="divide-y divide-zinc-800/80">
            {data.active_orders.map((ord) => (
              <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-zinc-200">{ord.order_number}</span>
                  <span className="text-amber-400 ml-2 font-medium">({ord.table_number})</span>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {ord.items_count} items • Placed at {ord.created_at}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-zinc-100">{ord.total_amount.toLocaleString()} Ks</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[10px] font-semibold">
                    {ord.status}
                  </span>
                  <button 
                    onClick={() => onNavigate('menu')}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-medium"
                  >
                    + Add Items
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500">
            No active dining orders right now. Click on any table to take an order!
          </div>
        )}
      </div>
    </div>
  );
};
