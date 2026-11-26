import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  PlusCircle, 
  ArrowRightLeft, 
  Calendar, 
  Trash2, 
  Edit3, 
  UtensilsCrossed,
  Sparkles,
  Phone
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { RestaurantTable, TableStatus } from '../../types';

interface TableWithDetails extends RestaurantTable {
  active_order_number?: string;
  active_order_total?: number;
  active_waiter_name?: string;
}

interface ReservationItem {
  id: number;
  table_id: number;
  table_number?: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  reservation_time: string;
  status: string;
  notes?: string;
}

export const TableManagementScreen: React.FC<{ onNavigateToPOS: (tableId: number) => void }> = ({ onNavigateToPOS }) => {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();

  const [tables, setTables] = useState<TableWithDetails[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  // Modals state
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferSourceTable, setTransferSourceTable] = useState<TableWithDetails | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<number | null>(null);

  const [showReservationModal, setShowReservationModal] = useState<boolean>(false);
  const [resTableId, setResTableId] = useState<number | null>(null);
  const [resCustomer, setResCustomer] = useState<string>('');
  const [resPhone, setResPhone] = useState<string>('');
  const [resPartySize, setResPartySize] = useState<number>(4);
  const [resTime, setResTime] = useState<string>('');
  const [resNotes, setResNotes] = useState<string>('');

  const [showAddTableModal, setShowAddTableModal] = useState<boolean>(false);
  const [newTableNum, setNewTableNum] = useState<string>('');
  const [newTableCap, setNewTableCap] = useState<number>(4);
  const [newTableSec, setNewTableSec] = useState<string>('Main Dining Hall');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tablesRes, resRes] = await Promise.all([
        apiRequest<TableWithDetails[]>('/api/v1/tables'),
        apiRequest<ReservationItem[]>('/api/v1/tables/reservations')
      ]);
      setTables(tablesRes);
      setReservations(resRes);
    } catch (err) {
      console.error('Failed to load table data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (tableId: number, newStatus: TableStatus) => {
    try {
      await apiRequest(`/api/v1/tables/${tableId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      setTables(tables.map(t => t.id === tableId ? { ...t, status: newStatus } : t));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update table status');
    }
  };

  const handleTransferOrder = async () => {
    if (!transferSourceTable || !transferTargetId) return;
    try {
      await apiRequest('/api/v1/tables/transfer', {
        method: 'POST',
        body: JSON.stringify({
          from_table_id: transferSourceTable.id,
          to_table_id: transferTargetId
        })
      });
      setShowTransferModal(false);
      setTransferSourceTable(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to transfer order');
    }
  };

  const handleBookReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTableId) return;
    try {
      await apiRequest('/api/v1/tables/reservations', {
        method: 'POST',
        body: JSON.stringify({
          table_id: resTableId,
          customer_name: resCustomer,
          customer_phone: resPhone,
          party_size: resPartySize,
          reservation_time: resTime ? new Date(resTime).toISOString() : new Date().toISOString(),
          notes: resNotes
        })
      });
      setShowReservationModal(false);
      setResCustomer('');
      setResPhone('');
      setResNotes('');
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to book reservation');
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/tables', {
        method: 'POST',
        body: JSON.stringify({
          table_number: newTableNum,
          capacity: newTableCap,
          section: newTableSec
        })
      });
      setShowAddTableModal(false);
      setNewTableNum('');
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add table');
    }
  };

  const statusStyles: Record<TableStatus, { bg: string; text: string; border: string }> = {
    AVAILABLE: { bg: 'bg-emerald-950/60', text: 'text-emerald-400', border: 'border-emerald-700/60' },
    OCCUPIED: { bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-700/60' },
    RESERVED: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-700/60' },
    CLEANING: { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-700/60' },
  };

  const filteredTables = tables.filter(t => {
    if (selectedSection === 'ALL') return true;
    return t.section?.toLowerCase().includes(selectedSection.toLowerCase());
  });

  const availableTables = tables.filter(t => t.status === 'AVAILABLE');
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED');
  const isAuthorizedToManage = currentUser?.role === 'OWNER' || currentUser?.role === 'MANAGER';

  const formatMMK = (val: number) => `${val.toLocaleString()} Ks`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-zinc-100">Restaurant Floor Plan & Seating</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visual table map, guest seating occupancy, table transfers, and VIP dining room reservations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (tables.length > 0) setResTableId(tables[0].id);
              setShowReservationModal(true);
            }}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-black text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>+ Book Reservation</span>
          </button>

          {isAuthorizedToManage && (
            <button
              onClick={() => setShowAddTableModal(true)}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition"
            >
              + Add Table
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Seating Occupancy Badges Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400">Available Tables</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{availableTables.length}</div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400">Occupied (Seated)</span>
            <div className="text-lg font-bold text-red-400 mt-0.5">{occupiedTables.length}</div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400">Reserved Tables</span>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {tables.filter(t => t.status === 'RESERVED').length}
            </div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400">Cleaning / Reset</span>
            <div className="text-lg font-bold text-blue-400 mt-0.5">
              {tables.filter(t => t.status === 'CLEANING').length}
            </div>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        </div>
      </div>

      {/* Section Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Floor Sections' },
          { id: 'Main Dining', label: 'Main Dining Hall' },
          { id: 'VIP', label: 'VIP Rooms (Dragon & Phoenix)' },
          { id: 'Outdoor', label: 'Outdoor Garden Terrace' },
          { id: 'Bar', label: 'Bar Counter' },
        ].map(sec => (
          <button
            key={sec.id}
            onClick={() => setSelectedSection(sec.id)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition whitespace-nowrap ${
              selectedSection === sec.id
                ? 'bg-amber-600 text-black shadow-lg font-bold'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Interactive Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.map(t => {
          const style = statusStyles[t.status] || statusStyles.AVAILABLE;

          return (
            <div
              key={t.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-xl ${style.bg} ${style.border}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-zinc-100">{t.table_number}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${style.text} ${style.border}`}>
                    {t.status}
                  </span>
                </div>

                <div className="mt-2 text-xs text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Seats {t.capacity} guests</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">{t.section}</p>
                </div>

                {/* Occupied Order Info */}
                {t.status === 'OCCUPIED' && t.active_order_number && (
                  <div className="mt-3 p-2 bg-black/40 rounded-lg border border-red-900/40 text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-400 text-[10px]">Order:</span>
                      <span className="font-bold text-zinc-200">{t.active_order_number}</span>
                    </div>
                    {t.active_order_total && (
                      <div className="flex justify-between">
                        <span className="text-zinc-400 text-[10px]">Total:</span>
                        <span className="font-bold text-emerald-400">{formatMMK(t.active_order_total)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs gap-1">
                {t.status === 'AVAILABLE' ? (
                  <button
                    onClick={() => onNavigateToPOS(t.id)}
                    className="w-full py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-center transition shadow"
                  >
                    + Take Order
                  </button>
                ) : t.status === 'OCCUPIED' ? (
                  <div className="flex items-center justify-between w-full gap-2">
                    <button
                      onClick={() => onNavigateToPOS(t.id)}
                      className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-750 text-amber-400 font-semibold rounded-lg text-center transition"
                    >
                      + Add Items
                    </button>
                    <button
                      onClick={() => {
                        setTransferSourceTable(t);
                        setShowTransferModal(true);
                      }}
                      title="Transfer order to another table"
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : t.status === 'CLEANING' ? (
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'AVAILABLE')}
                    className="w-full py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg text-center transition"
                  >
                    Mark Cleaned
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'AVAILABLE')}
                    className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg text-center transition"
                  >
                    Release Reserved
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Reservations List */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-amber-400" />
          Scheduled Guest Reservations
        </h3>

        {reservations.length > 0 ? (
          <div className="divide-y divide-zinc-800/80">
            {reservations.map(r => (
              <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200">{r.customer_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                      {r.table_number || `Table #${r.table_id}`}
                    </span>
                    <span className="text-zinc-500">Party of {r.party_size}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                    <Phone className="w-3 h-3 text-zinc-500" />
                    <span>{r.customer_phone}</span>
                    {r.notes && <span>• Note: {r.notes}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-[11px]">
                    {new Date(r.reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-zinc-500">
            No reservations scheduled for today yet.
          </div>
        )}
      </div>

      {/* Transfer Order Modal */}
      {showTransferModal && transferSourceTable && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-400" />
              Transfer Table Order
            </h3>
            <p className="text-xs text-zinc-400">
              Transfer active order <strong className="text-zinc-200">{transferSourceTable.active_order_number}</strong> from Table <strong className="text-amber-400">{transferSourceTable.table_number}</strong> to another available dining table.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Select Target Table</label>
              <select
                value={transferTargetId || ''}
                onChange={(e) => setTransferTargetId(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Choose target available table --</option>
                {availableTables.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.table_number} - {t.section} (Seats {t.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransferOrder}
                disabled={!transferTargetId}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-black text-xs font-bold rounded-xl transition shadow disabled:opacity-50"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Reservation Modal */}
      {showReservationModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Book Table Reservation
            </h3>

            <form onSubmit={handleBookReservation} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={resCustomer}
                  onChange={(e) => setResCustomer(e.target.value)}
                  placeholder="e.g. U Thant / Daw Khin"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={resPhone}
                  onChange={(e) => setResPhone(e.target.value)}
                  placeholder="09-xxxxxxxxx"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Table</label>
                  <select
                    value={resTableId || ''}
                    onChange={(e) => setResTableId(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  >
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.table_number} ({t.section})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Party Size</label>
                  <input
                    type="number"
                    value={resPartySize}
                    onChange={(e) => setResPartySize(Number(e.target.value))}
                    min={1}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={resTime}
                  onChange={(e) => setResTime(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="e.g. Birthday dinner celebration..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReservationModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-black text-xs font-bold rounded-xl transition shadow"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Add Dining Table</h3>

            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Table Number</label>
                <input
                  type="text"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  placeholder="e.g. T-16 or VIP-03"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Seating Capacity</label>
                <input
                  type="number"
                  value={newTableCap}
                  onChange={(e) => setNewTableCap(Number(e.target.value))}
                  min={1}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Section</label>
                <select
                  value={newTableSec}
                  onChange={(e) => setNewTableSec(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
                >
                  <option value="Main Dining Hall">Main Dining Hall (စားသောက်ပွဲရုံမ)</option>
                  <option value="VIP Room Dragon">VIP Room Dragon (နဂါးခန်း)</option>
                  <option value="VIP Room Phoenix">VIP Room Phoenix (ဖီးနစ်ခန်း)</option>
                  <option value="Outdoor Garden Terrace">Outdoor Garden Terrace (ပြင်ပလေသာဆောင်)</option>
                  <option value="Bar Counter">Bar Counter (ဘားကောင်တာ)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddTableModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition shadow"
                >
                  Add Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
