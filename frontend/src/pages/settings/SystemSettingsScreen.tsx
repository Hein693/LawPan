import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  ShieldCheck, 
  Download, 
  RotateCcw, 
  CheckCircle, 
  RefreshCw, 
  Store, 
  FileText, 
  Lock,
  HardDrive
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface BackupItem {
  filename: string;
  size_bytes: number;
  created_at: string;
  filepath: string;
}

interface AuditLog {
  id: number;
  username: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: string | null;
  timestamp: string;
}

export const SystemSettingsScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const isOwner = currentUser?.role === 'OWNER';

  const [activeTab, setActiveTab] = useState<'backups' | 'audit' | 'settings'>('backups');
  const [loading, setLoading] = useState<boolean>(true);

  // Backups State
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>('ALL');

  // Settings State
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [restNameEn, setRestNameEn] = useState<string>('LAW PAN CHINESE RESTAURANT');
  const [restNameMm, setRestNameMm] = useState<string>('လောပန် တရုတ်ရိုးရာ စားသောက်ဆိုင်');
  const [restAddress, setRestAddress] = useState<string>('No. 88, Mahabandoola Road, Yangon, Myanmar');
  const [restPhone, setRestPhone] = useState<string>('+95 9 789 123 456');
  const [currencySymbol, setCurrencySymbol] = useState<string>('Ks');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'backups') {
        const res = await apiRequest<BackupItem[]>('/api/v1/system/backups');
        setBackups(res);
      } else if (activeTab === 'audit') {
        const res = await apiRequest<AuditLog[]>('/api/v1/system/audit-logs');
        setAuditLogs(res);
      } else if (activeTab === 'settings') {
        const res = await apiRequest<{ settings: Record<string, string> }>('/api/v1/system/settings');
        const s = res.settings;
        setSettingsMap(s);
        if (s.restaurant_name) setRestNameEn(s.restaurant_name);
        if (s.restaurant_name_mm) setRestNameMm(s.restaurant_name_mm);
        if (s.restaurant_address) setRestAddress(s.restaurant_address);
        if (s.restaurant_phone) setRestPhone(s.restaurant_phone);
        if (s.currency_symbol) setCurrencySymbol(s.currency_symbol);
      }
    } catch (err) {
      console.error('Failed to load system data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await apiRequest<BackupItem>('/api/v1/system/backup', { method: 'POST' });
      alert(`Database backup created successfully: ${res.filename}`);
      fetchData();
    } catch (err: any) {
      alert(`Backup failed: ${err.message || 'Error'}`);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to restore database from ${filename}? Current data will be safely archived first.`)) {
      return;
    }
    try {
      await apiRequest(`/api/v1/system/restore?filename=${filename}`, { method: 'POST' });
      alert('Database restored successfully! Reloading...');
      window.location.reload();
    } catch (err: any) {
      alert(`Restore failed: ${err.message || 'Error'}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await Promise.all([
        apiRequest('/api/v1/system/settings', {
          method: 'PUT',
          body: JSON.stringify({ key: 'restaurant_name', value: restNameEn })
        }),
        apiRequest('/api/v1/system/settings', {
          method: 'PUT',
          body: JSON.stringify({ key: 'restaurant_name_mm', value: restNameMm })
        }),
        apiRequest('/api/v1/system/settings', {
          method: 'PUT',
          body: JSON.stringify({ key: 'restaurant_address', value: restAddress })
        }),
        apiRequest('/api/v1/system/settings', {
          method: 'PUT',
          body: JSON.stringify({ key: 'restaurant_phone', value: restPhone })
        }),
        apiRequest('/api/v1/system/settings', {
          method: 'PUT',
          body: JSON.stringify({ key: 'currency_symbol', value: currencySymbol })
        })
      ]);
      alert('Restaurant settings saved successfully.');
      fetchData();
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message || 'Error'}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredLogs = auditLogs.filter(l => 
    auditFilter === 'ALL' || l.action.includes(auditFilter)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-500" />
            <span>System Administration, Local Backups & Audits</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Offline database snapshot creation, restoration safeguards, immutable security audit trail, and restaurant configurations.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        {[
          { id: 'backups', label: 'Local Database Backups', icon: Database },
          { id: 'audit', label: 'Security & Action Audit Logs', icon: ShieldCheck },
          { id: 'settings', label: 'Restaurant & POS Settings', icon: Store },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition ${
                isActive
                  ? 'border-amber-500 text-amber-400 bg-amber-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LOCAL DATABASE BACKUPS */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Single-PC Offline Database Storage</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                All restaurant transactions, menu, recipes, and accounting data are stored locally in SQLite (`backend/data/lawpan.db`).
              </p>
            </div>

            {isOwner && (
              <button
                disabled={creatingBackup}
                onClick={handleCreateBackup}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 text-black text-xs font-bold rounded-xl transition flex items-center gap-2 shadow"
              >
                <Database className="w-4 h-4" />
                <span>{creatingBackup ? 'Creating Snapshot...' : 'Create Backup Snapshot Now'}</span>
              </button>
            )}
          </div>

          {/* Backup List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Available Local Backups ({backups.length})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2.5 px-3">Backup Filename</th>
                    <th className="py-2.5 px-3">Created Date & Time</th>
                    <th className="py-2.5 px-3">File Size</th>
                    <th className="py-2.5 px-3 text-right">Safeguard Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {backups.map((bk) => (
                    <tr key={bk.filename} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-zinc-100 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-amber-500" />
                        <span>{bk.filename}</span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">{new Date(bk.created_at).toLocaleString()}</td>
                      <td className="py-2.5 px-3">{(bk.size_bytes / 1024).toFixed(1)} KB</td>
                      <td className="py-2.5 px-3 text-right">
                        {isOwner && (
                          <button
                            onClick={() => handleRestoreBackup(bk.filename)}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-red-950 hover:text-red-300 text-zinc-300 rounded border border-zinc-700 hover:border-red-700/60 transition text-[11px] font-semibold"
                          >
                            Restore Snapshot
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Immutable System Event Logs</h3>
              <p className="text-xs text-zinc-400">Cryptographically verifiable trace of staff actions and sensitive operations</p>
            </div>

            <div className="flex gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
              {['ALL', 'PAYMENT', 'REFUND', 'ORDER', 'BACKUP'].map((a) => (
                <button
                  key={a}
                  onClick={() => setAuditFilter(a)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    auditFilter === a
                      ? 'bg-amber-600 text-black font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Staff User</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Target Entity</th>
                    <th className="py-2.5 px-3">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-semibold text-amber-400">{log.username}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          log.action.includes('REFUND')
                            ? 'bg-red-950 text-red-300 border-red-700/60'
                            : log.action.includes('PAYMENT')
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">{log.entity} {log.entity_id ? `(#${log.entity_id})` : ''}</td>
                      <td className="py-2.5 px-3 text-zinc-300">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-2xl space-y-4">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-500" />
            <span>Restaurant Profile & Receipt Settings</span>
          </h3>
          <p className="text-xs text-zinc-400">
            These values appear on all customer 80mm thermal receipts and waiter bill presentations.
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Restaurant Name (English)</label>
              <input
                type="text"
                value={restNameEn}
                onChange={(e) => setRestNameEn(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Restaurant Name (Burmese)</label>
              <input
                type="text"
                value={restNameMm}
                onChange={(e) => setRestNameMm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Physical Address</label>
              <input
                type="text"
                value={restAddress}
                onChange={(e) => setRestAddress(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={restPhone}
                  onChange={(e) => setRestPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Currency Code / Symbol</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 font-bold"
                />
              </div>
            </div>

            {isOwner && (
              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving Settings...' : 'Save System Settings'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
