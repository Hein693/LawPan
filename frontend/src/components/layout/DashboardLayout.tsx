import React, { useState } from 'react';
import { 
  Store, 
  UtensilsCrossed, 
  ChefHat, 
  CircleDollarSign, 
  Layers, 
  Package, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Languages, 
  Menu, 
  X,
  FileText,
  UserCheck,
  Truck,
  DollarSign,
  Coffee,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { UserRole } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, logout, quickLogin } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState<boolean>(false);

  const getNavItems = (role?: UserRole) => {
    switch (role) {
      case 'OWNER':
        return [
          { id: 'dashboard', labelEn: 'Dashboard Overview', labelMm: 'ဒက်ရှ်ဘုတ် အကျဉ်းချုပ်', icon: <Store className="w-4 h-4" /> },
          { id: 'menu', labelEn: 'Menu & Categories', labelMm: 'ဟင်းပွဲနှင့် အမျိုးအစားများ', icon: <UtensilsCrossed className="w-4 h-4" /> },
          { id: 'tables', labelEn: 'Tables & Floor Plan', labelMm: 'စားပွဲနှင့် ကြမ်းပြင်ပြကွက်', icon: <Layers className="w-4 h-4" /> },
          { id: 'kitchen', labelEn: 'Kitchen Monitor (KDS)', labelMm: 'မီးဖိုချောင် စောင့်ကြည့်ပြကွက်', icon: <ChefHat className="w-4 h-4" /> },
          { id: 'billing', labelEn: 'Billing & Cashier', labelMm: 'ငွေရှင်းခြင်းနှင့် ဘေလ်', icon: <CircleDollarSign className="w-4 h-4" /> },
          { id: 'inventory', labelEn: 'Inventory & Recipes', labelMm: 'ကုန်ကြမ်းနှင့် ချက်နည်းများ', icon: <Package className="w-4 h-4" /> },
          { id: 'suppliers', labelEn: 'Suppliers & Purchases', labelMm: 'ကုန်တင်သွင်းသူနှင့် ဝယ်ယူမှု', icon: <Truck className="w-4 h-4" /> },
          { id: 'employees', labelEn: 'Staff & Shifts', labelMm: 'ဝန်ထမ်းနှင့် အလုပ်ချိန်', icon: <Users className="w-4 h-4" /> },
          { id: 'expenses', labelEn: 'Operating Expenses', labelMm: 'လုပ်ငန်းလည်ပတ်စရိတ်', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'reports', labelEn: 'Reports & P&L', labelMm: 'အစီရင်ခံစာနှင့် အမြတ်စာရင်း', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'settings', labelEn: 'Settings & Backups', labelMm: 'စနစ်ချိန်ညှိချက်နှင့် မိတ္တူ', icon: <Settings className="w-4 h-4" /> },
        ];
      case 'MANAGER':
        return [
          { id: 'dashboard', labelEn: 'Operations Center', labelMm: 'လုပ်ငန်းဆောင်ရွက်မှုဗဟို', icon: <Store className="w-4 h-4" /> },
          { id: 'tables', labelEn: 'Tables & Seating', labelMm: 'စားပွဲနှင့် နေရာထိုင်ခင်း', icon: <Layers className="w-4 h-4" /> },
          { id: 'menu', labelEn: 'Menu Availability', labelMm: 'ဟင်းပွဲရရှိနိုင်မှု', icon: <UtensilsCrossed className="w-4 h-4" /> },
          { id: 'kitchen', labelEn: 'Kitchen Queue', labelMm: 'မီးဖိုချောင် အခြေအနေ', icon: <ChefHat className="w-4 h-4" /> },
          { id: 'inventory', labelEn: 'Stock Monitoring', labelMm: 'ကုန်ကြမ်းစစ်ဆေးခြင်း', icon: <Package className="w-4 h-4" /> },
          { id: 'employees', labelEn: 'Staff Attendance', labelMm: 'ဝန်ထမ်းတက်ရောက်မှု', icon: <UserCheck className="w-4 h-4" /> },
          { id: 'reports', labelEn: 'Daily Sales Report', labelMm: 'နေ့စဉ် အရောင်းအစီရင်ခံစာ', icon: <FileText className="w-4 h-4" /> },
        ];
      case 'WAITER':
        return [
          { id: 'tables', labelEn: 'Dining Tables', labelMm: 'စားပွဲများ', icon: <Layers className="w-4 h-4" /> },
          { id: 'orders', labelEn: 'Active Orders', labelMm: 'လက်ရှိ အော်ဒါများ', icon: <UtensilsCrossed className="w-4 h-4" /> },
          { id: 'menu', labelEn: 'Menu & Prices', labelMm: 'ဟင်းပွဲမီနူးနှင့် ဈေးနှုန်း', icon: <Coffee className="w-4 h-4" /> },
          { id: 'kitchen', labelEn: 'Order Status', labelMm: 'ဟင်းပွဲပြီးစီးမှု', icon: <ChefHat className="w-4 h-4" /> },
        ];
      case 'CASHIER':
        return [
          { id: 'billing', labelEn: 'Unpaid Bills', labelMm: 'မရှင်းရသေးသော ဘေလ်များ', icon: <CircleDollarSign className="w-4 h-4" /> },
          { id: 'payments', labelEn: 'Today Transactions', labelMm: 'ယနေ့ ငွေလက်ခံမှတ်တမ်း', icon: <DollarSign className="w-4 h-4" /> },
          { id: 'tables', labelEn: 'Table Status', labelMm: 'စားပွဲအခြေအနေ', icon: <Layers className="w-4 h-4" /> },
          { id: 'drawer', labelEn: 'Cash Reconciliation', labelMm: 'ငွေစာရင်း ချိန်ကိုက်ခြင်း', icon: <FileText className="w-4 h-4" /> },
        ];
      case 'KITCHEN':
        return [
          { id: 'kitchen', labelEn: 'Kitchen Display (KDS)', labelMm: 'ဟင်းချက်ပြကွက် (KDS)', icon: <ChefHat className="w-4 h-4" /> },
          { id: 'stations', labelEn: 'Station Queues', labelMm: 'ဌာနအလိုက် အော်ဒါများ', icon: <Layers className="w-4 h-4" /> },
        ];
      default:
        return [
          { id: 'dashboard', labelEn: 'Overview', labelMm: 'အကျဉ်းချုပ်', icon: <Store className="w-4 h-4" /> }
        ];
    }
  };

  const navItems = getNavItems(currentUser?.role);

  const roleColors: Record<UserRole, { badge: string; text: string }> = {
    OWNER: { badge: 'bg-red-950/80 border-red-700/60 text-red-300', text: 'text-red-400' },
    MANAGER: { badge: 'bg-amber-950/80 border-amber-700/60 text-amber-300', text: 'text-amber-400' },
    WAITER: { badge: 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300', text: 'text-emerald-400' },
    CASHIER: { badge: 'bg-blue-950/80 border-blue-700/60 text-blue-300', text: 'text-blue-400' },
    KITCHEN: { badge: 'bg-orange-950/80 border-orange-700/60 text-orange-300', text: 'text-orange-400' },
  };

  const currentRoleStyle = currentUser?.role ? roleColors[currentUser.role] : roleColors.OWNER;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Chinese Restaurant Brand Navigation Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <img 
            src="/lawpan_logo.jpg" 
            alt="LAW PAN" 
            className="w-10 h-10 rounded-full border-2 border-amber-500/80 object-cover shadow-md shadow-amber-500/10"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-wide text-amber-400">LAW PAN</span>
              <span className="text-xs text-zinc-400 font-medium hidden sm:inline">(လောပန်တရုတ်စားသောက်ဆိုင်)</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${currentRoleStyle.badge}`}>
                {currentUser?.role} PORTAL
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {currentUser?.name} • Yangon, Myanmar • MMK ({t('currency_symbol')})
            </p>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Role Switcher (Crucial for Local Single-PC Testing & Multi-staff Shift Change) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-amber-400 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Switch Role:</span>
              <span className="text-amber-400 font-bold">{currentUser?.role}</span>
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 z-50 space-y-1">
                <span className="block px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Fast Shift Change
                </span>
                {(['OWNER', 'MANAGER', 'WAITER', 'CASHIER', 'KITCHEN'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={async () => {
                      await quickLogin(r);
                      setShowRoleSwitcher(false);
                      setActiveTab('dashboard');
                    }}
                    className={`w-full px-2.5 py-1.5 text-xs text-left rounded-lg transition flex items-center justify-between ${
                      currentUser?.role === r 
                        ? 'bg-red-950 text-amber-400 font-semibold' 
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span>{r}</span>
                    {currentUser?.role === r && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bilingual Switcher */}
          <div className="flex items-center bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-700">
            <Languages className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs font-medium rounded transition ${
                language === 'en' ? 'bg-red-700 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('mm')}
              className={`px-2 py-1 text-xs font-medium rounded transition ${
                language === 'mm' ? 'bg-red-700 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              မြန်မာ
            </button>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            title={t('logout')}
            className="p-1.5 bg-zinc-800 hover:bg-red-950/80 hover:text-red-400 text-zinc-400 rounded-lg border border-zinc-700 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Body with Sidebar and Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Role-Specific Sidebar */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-30 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 space-y-4 overflow-y-auto">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-3">
              {currentUser?.role} NAVIGATION
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                      isActive
                        ? 'bg-red-800 text-white shadow-md shadow-red-900/20 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={isActive ? 'text-amber-300' : 'text-zinc-400'}>{item.icon}</span>
                    <span>{language === 'mm' ? item.labelMm : item.labelEn}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer info */}
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 text-xs text-zinc-500 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Offline System Active</span>
            </div>
            <p className="text-[10px] text-zinc-500">FastAPI SQLite Local Server</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
