import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  Layers, 
  RefreshCw,
  Utensils
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';

interface KitchenData {
  stations: {
    code: string;
    name_en: string;
    name_mm: string;
  }[];
  active_tickets: {
    id: number;
    order_id: number;
    station: string;
    status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED';
    item_name_en: string;
    item_name_mm: string;
    quantity: number;
    special_instructions?: string;
    created_at: string;
  }[];
  pending_count: number;
  preparing_count: number;
}

export const KitchenDashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const [data, setData] = useState<KitchenData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStation, setSelectedStation] = useState<string>('ALL');

  useEffect(() => {
    fetchKitchenData();
    // Poll or sync every 10 seconds for real-time order receipts
    const interval = setInterval(fetchKitchenData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchKitchenData = async () => {
    try {
      const res = await apiRequest<KitchenData>('/api/v1/dashboard/kitchen');
      setData(res);
    } catch (err) {
      console.error('Failed to load kitchen dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const advanceStatus = async (ticketId: number, currentStatus: string) => {
    if (!data) return;
    const nextStatusMap: Record<string, 'PREPARING' | 'READY' | 'SERVED'> = {
      PENDING: 'PREPARING',
      ACCEPTED: 'PREPARING',
      PREPARING: 'READY',
      READY: 'SERVED'
    };
    const next = nextStatusMap[currentStatus] || 'SERVED';

    try {
      await apiRequest(`/api/v1/kitchen/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next })
      });
      fetchKitchenData();
    } catch (err: unknown) {
      console.error('Failed to update ticket status:', err);
    }
  };

  const filteredTickets = data?.active_tickets.filter(t => {
    if (selectedStation === 'ALL') return true;
    return t.station === selectedStation;
  }) || [];

  const statusBadges: Record<string, { bg: string; text: string; border: string }> = {
    PENDING: { bg: 'bg-red-950/80', text: 'text-red-400', border: 'border-red-800' },
    PREPARING: { bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-800' },
    READY: { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-800' },
    SERVED: { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-orange-400" />
            <span>Kitchen Display System (KDS)</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time kitchen order queue, cooking instructions, and station routing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-red-950/80 border border-red-800 text-red-300 rounded font-semibold">
              {data?.pending_count || 0} Pending
            </span>
            <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-800 text-amber-300 rounded font-semibold">
              {data?.preparing_count || 0} Cooking
            </span>
          </div>

          <button
            onClick={fetchKitchenData}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Station Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedStation('ALL')}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
            selectedStation === 'ALL'
              ? 'bg-orange-600 text-black shadow'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          All Kitchen Stations
        </button>

        {data?.stations.map((st) => (
          <button
            key={st.code}
            onClick={() => setSelectedStation(st.code)}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
              selectedStation === st.code
                ? 'bg-orange-600 text-black shadow'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {language === 'mm' ? st.name_mm : st.name_en}
          </button>
        ))}
      </div>

      {/* Kitchen Ticket Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTickets.map((ticket) => {
          const badge = statusBadges[ticket.status] || statusBadges.PENDING;

          return (
            <div
              key={ticket.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-100">Order #{ticket.order_id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                      {ticket.station}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${badge.bg} ${badge.text} ${badge.border}`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-zinc-100">{ticket.item_name_en}</h4>
                      <p className="text-xs text-amber-400 font-medium">{ticket.item_name_mm}</p>
                    </div>
                    <span className="text-2xl font-black text-amber-400 px-3 py-1 bg-zinc-950 rounded-xl border border-zinc-800">
                      ×{ticket.quantity}
                    </span>
                  </div>

                  {ticket.special_instructions && (
                    <div className="mt-3 p-2.5 bg-red-950/40 border border-red-900/60 rounded-lg text-xs text-red-300 font-medium flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Note: {ticket.special_instructions}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{ticket.created_at}</span>
                </div>

                <button
                  onClick={() => advanceStatus(ticket.id, ticket.status)}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-orange-700 hover:text-white text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition"
                >
                  {ticket.status === 'PENDING' ? 'Start Cooking' : ticket.status === 'PREPARING' ? 'Mark Ready' : 'Mark Served'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTickets.length === 0 && (
        <div className="p-12 text-center text-xs text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <ChefHat className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          No tickets waiting in this station queue right now.
        </div>
      )}
    </div>
  );
};
