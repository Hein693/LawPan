import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginView } from './pages/auth/LoginView';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { WaiterDashboard } from './pages/waiter/WaiterDashboard';
import { CashierDashboard } from './pages/cashier/CashierDashboard';
import { KitchenDashboard } from './pages/kitchen/KitchenDashboard';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { MenuManagement } from './pages/menu/MenuManagement';
import { POSOrderScreen } from './pages/pos/POSOrderScreen';
import { TableManagementScreen } from './pages/tables/TableManagementScreen';

function AppContent() {
  const { currentUser, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  if (!isAuthenticated || !currentUser) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    // 1. Direct Module Navigation Tabs
    if (activeTab === 'orders' || activeTab === 'pos') {
      return <POSOrderScreen onOrderSubmitted={() => setActiveTab('tables')} />;
    }
    if (activeTab === 'menu') {
      return <MenuManagement />;
    }
    if (activeTab === 'tables') {
      return <TableManagementScreen onNavigateToPOS={() => setActiveTab('orders')} />;
    }
    if (activeTab === 'kitchen' || activeTab === 'stations') {
      return <KitchenDashboard />;
    }
    if (activeTab === 'billing' || activeTab === 'payments' || activeTab === 'drawer') {
      return <CashierDashboard />;
    }

    // 2. Role-Based Primary Dashboard
    switch (currentUser.role) {
      case 'OWNER':
        return <OwnerDashboard onNavigate={setActiveTab} />;
      case 'MANAGER':
        return <ManagerDashboard onNavigate={setActiveTab} />;
      case 'WAITER':
        return <WaiterDashboard onNavigate={setActiveTab} />;
      case 'CASHIER':
        return <CashierDashboard />;
      case 'KITCHEN':
        return <KitchenDashboard />;
      default:
        return <OwnerDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActiveView()}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
