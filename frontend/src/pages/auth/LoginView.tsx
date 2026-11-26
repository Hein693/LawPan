import React, { useState } from 'react';
import { 
  Store, 
  ShieldCheck, 
  UtensilsCrossed, 
  CircleDollarSign, 
  ChefHat, 
  Lock, 
  User as UserIcon, 
  Languages, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { UserRole } from '../../types';

export const LoginView: React.FC = () => {
  const { login, quickLogin, loading, error } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [username, setUsername] = useState<string>('owner');
  const [password, setPassword] = useState<string>('lawpan123');

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  const quickRoles: { role: UserRole; username: string; labelEn: string; labelMm: string; icon: React.ReactNode; color: string }[] = [
    { role: 'OWNER', username: 'owner', labelEn: 'Owner (U Kyaw)', labelMm: 'ဆိုင်ရှင် (ဦးကျော်)', icon: <Store className="w-5 h-5" />, color: 'bg-red-700 hover:bg-red-800 border-red-600' },
    { role: 'MANAGER', username: 'manager', labelEn: 'Manager (Daw Hlaing)', labelMm: 'မန်နေဂျာ (ဒေါ်လှိုင်)', icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-amber-700 hover:bg-amber-800 border-amber-600' },
    { role: 'WAITER', username: 'waiter', labelEn: 'Waiter (Aung Ko)', labelMm: 'စားပွဲထိုး (အောင်ကို)', icon: <UtensilsCrossed className="w-5 h-5" />, color: 'bg-emerald-700 hover:bg-emerald-800 border-emerald-600' },
    { role: 'CASHIER', username: 'cashier', labelEn: 'Cashier (Su Su)', labelMm: 'ငွေကိုင် (စုစု)', icon: <CircleDollarSign className="w-5 h-5" />, color: 'bg-blue-700 hover:bg-blue-800 border-blue-600' },
    { role: 'KITCHEN', username: 'kitchen', labelEn: 'Kitchen (Chef Chen)', labelMm: 'မီးဖိုချောင် (ဆရာချန်း)', icon: <ChefHat className="w-5 h-5" />, color: 'bg-orange-700 hover:bg-orange-800 border-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Background Subtle Chinese Geometric Pattern Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full z-10">
        <div className="flex items-center gap-3">
          <img 
            src="/lawpan_logo.jpg" 
            alt="LAW PAN Logo" 
            className="w-12 h-12 rounded-full border-2 border-amber-500/80 object-cover shadow-lg shadow-amber-500/10"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-xl font-bold tracking-wide text-amber-400">LAW PAN (လောပန်)</h1>
            <p className="text-xs text-zinc-400">Chinese Restaurant POS & Management System</p>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <Languages className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 text-xs font-medium rounded transition ${
              language === 'en' ? 'bg-red-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('mm')}
            className={`px-2 py-1 text-xs font-medium rounded transition ${
              language === 'mm' ? 'bg-red-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            မြန်မာ
          </button>
        </div>
      </header>

      {/* Main Login Container */}
      <div className="max-w-4xl mx-auto w-full py-8 z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: 1-Click Fast Shift Login (For busy restaurant touch operations) */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {language === 'mm' ? 'အမြန်တာဝန်လွှဲပြောင်းမှု' : 'Fast Touch Shift Sign-In'}
            </span>
            <h2 className="text-xl font-bold text-zinc-100 mt-1">
              {language === 'mm' ? 'သက်ဆိုင်ရာ ဝန်ထမ်းအကောင့်ကို ရွေးချယ်ပါ' : 'Select Your Assigned Shift Portal'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {language === 'mm'
                ? 'စားသောက်ဆိုင်အတွင်း အမြန်သုံးနိုင်ရန် အောက်ပါတာဝန်ခလုတ်ကို တစ်ချက်နှိပ်၍ စနစ်အတွင်း ဝင်ရောက်နိုင်ပါသည်'
                : 'Click any role below to sign in instantly with role-based permissions enforced by the backend'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {quickRoles.map((qr) => (
              <button
                key={qr.role}
                disabled={loading}
                onClick={() => quickLogin(qr.role)}
                className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/70 p-3.5 rounded-xl text-left transition group shadow-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${qr.color}`}>
                    {qr.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-100">{qr.role}</h4>
                    <p className="text-[11px] text-zinc-400">{language === 'mm' ? qr.labelMm : qr.labelEn}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Standard Username/Password Credentials Login */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Credentials Authentication
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Local SQLite database authorization</p>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleFormLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. owner, manager, waiter..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter staff password"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-lg transition shadow flex items-center justify-center gap-1.5"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-800 text-center">
            <span className="text-[11px] text-zinc-500">
              Default password for all demo accounts: <strong className="text-amber-400 font-mono">lawpan123</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-500 max-w-5xl mx-auto w-full z-10 py-2">
        LAW PAN Chinese Restaurant Management System • Local Single-PC Standalone Deployment
      </footer>
    </div>
  );
};
