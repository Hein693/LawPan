import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'mm';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Brand & App
    appName: 'LAW PAN',
    restaurantTitle: 'Chinese Restaurant & Bar',
    systemTitle: 'Restaurant POS & Management System',
    tagline: 'Professional Local Restaurant Operating Platform',
    
    // Roles
    role_owner: 'Owner',
    role_manager: 'Manager',
    role_waiter: 'Waiter',
    role_cashier: 'Cashier',
    role_kitchen: 'Kitchen Staff',
    
    // Navigation & Common
    dashboard: 'Dashboard',
    pos_orders: 'POS & Orders',
    tables: 'Tables & Floor Plan',
    kitchen_display: 'Kitchen Display (KDS)',
    billing_cashier: 'Billing & Cashier',
    menu_management: 'Menu Management',
    inventory_recipes: 'Inventory & Recipes',
    purchasing_suppliers: 'Purchases & Suppliers',
    employees: 'Employee Management',
    customers: 'Customer Loyalty',
    expenses: 'Expense Tracker',
    reports_analytics: 'Reports & Analytics',
    settings: 'System Settings',
    logout: 'Logout',
    quick_switch: 'Switch Role',
    
    // Actions & Status
    search: 'Search',
    add_item: 'Add Item',
    submit_order: 'Submit to Kitchen',
    request_bill: 'Request Bill',
    pay_now: 'Process Payment',
    mark_ready: 'Mark Ready',
    mark_served: 'Mark Served',
    status: 'Status',
    available: 'Available',
    occupied: 'Occupied',
    reserved: 'Reserved',
    cleaning: 'Cleaning',
    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    currency: 'MMK',
    currency_symbol: 'Ks',
    loading: 'Loading system...',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    print_receipt: 'Print Receipt',
    reprint_receipt: 'Reprint Receipt'
  },
  mm: {
    // Brand & App
    appName: 'လောပန် (LAW PAN)',
    restaurantTitle: 'တရုတ်စားသောက်ဆိုင်နှင့် ဘား',
    systemTitle: 'စားသောက်ဆိုင် POS နှင့် စီမံခန့်ခွဲမှုစနစ်',
    tagline: 'အရည်အသွေးမြင့် စားသောက်ဆိုင်လုပ်ငန်းသုံးစနစ်',
    
    // Roles
    role_owner: 'ဆိုင်ရှင် (Owner)',
    role_manager: 'မန်နေဂျာ (Manager)',
    role_waiter: 'စားပွဲထိုး (Waiter)',
    role_cashier: 'ငွေကိုင် (Cashier)',
    role_kitchen: 'မီးဖိုချောင် (Kitchen)',
    
    // Navigation & Common
    dashboard: 'ပင်မဒက်ရှ်ဘုတ်',
    pos_orders: 'အော်ဒါမှာယူခြင်း',
    tables: 'စားပွဲနှင့် ကြမ်းပြင်ပြကွက်',
    kitchen_display: 'မီးဖိုချောင်ပြကွက် (KDS)',
    billing_cashier: 'ငွေချေခြင်းနှင့် ဘေလ်',
    menu_management: 'ဟင်းပွဲမီနူး စီမံခန့်ခွဲမှု',
    inventory_recipes: 'ကုန်ကြမ်းနှင့် ချက်နည်းများ',
    purchasing_suppliers: 'ဝယ်ယူမှုနှင့် ကုန်ပစ္စည်းတင်သွင်းသူများ',
    employees: 'ဝန်ထမ်းစီမံခန့်ခွဲမှု',
    customers: 'ဖောက်သည်နှင့် အမှတ်များ',
    expenses: 'အသုံးစရိတ်မှတ်တမ်း',
    reports_analytics: 'အစီရင်ခံစာနှင့် စာရင်းဇယားများ',
    settings: 'စနစ်ချိန်ညှိချက်များ',
    logout: 'အကောင့်ထွက်မည်',
    quick_switch: 'တာဝန်ပြောင်းမည်',
    
    // Actions & Status
    search: 'ရှာဖွေပါ',
    add_item: 'ပစ္စည်းထည့်ပါ',
    submit_order: 'မီးဖိုချောင်သို့ ပို့မည်',
    request_bill: 'ဘေလ်တောင်းမည်',
    pay_now: 'ငွေလက်ခံမည်',
    mark_ready: 'ချက်ပြီးပါပြီ',
    mark_served: 'ချကျွေးပြီးပါပြီ',
    status: 'အခြေအနေ',
    available: 'စားပွဲလွတ်',
    occupied: 'လူရှိသည်',
    reserved: 'ကြိုတင်ချိတ်ထားသည်',
    cleaning: 'ရှင်းလင်းနေသည်',
    total: 'စုစုပေါင်း',
    subtotal: 'ကျသင့်ငွေ',
    discount: 'လျှော့ဈေး',
    currency: 'ကျပ်',
    currency_symbol: 'Ks',
    loading: 'စနစ်စတင်ဖွင့်လှစ်နေသည်...',
    save: 'သိမ်းမည်',
    cancel: 'မလုပ်တော့ပါ',
    edit: 'ပြင်ဆင်မည်',
    delete: 'ဖျက်မည်',
    print_receipt: 'ဘောက်ချာထုတ်မည်',
    reprint_receipt: 'ဘောက်ချာပြန်ထုတ်မည်'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
