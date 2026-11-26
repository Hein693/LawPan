import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  Plus, 
  AlertTriangle, 
  ArrowDownUp, 
  BookOpen, 
  Truck, 
  CheckCircle, 
  RefreshCw, 
  Scale, 
  FileText,
  DollarSign,
  TrendingDown,
  Layers
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';

interface Ingredient {
  id: number;
  name_en: string;
  name_mm: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  purchase_price: number;
  is_low_stock: boolean;
}

interface Recipe {
  id: number;
  menu_item_id: number;
  menu_item_name: string;
  name: string;
  instructions: string;
  items: {
    id: number;
    ingredient_id: number;
    ingredient_name_en: string;
    ingredient_name_mm: string;
    quantity: number;
    unit: string;
  }[];
}

interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  address: string;
  outstanding_balance: number;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
  items: {
    ingredient_name: string;
    quantity: number;
    unit_cost: number;
    subtotal: number;
  }[];
}

interface StockTransaction {
  id: number;
  ingredient_name: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number;
  notes: string;
  created_by_name: string;
  created_at: string;
}

export const InventoryManagement: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'stock' | 'recipes' | 'purchasing' | 'ledger'>('stock');
  const [loading, setLoading] = useState<boolean>(true);

  // Stock State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [adjustIng, setAdjustIng] = useState<Ingredient | null>(null);
  const [adjustQty, setAdjustQty] = useState<string>('');
  const [adjustType, setAdjustType] = useState<string>('IN');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  const [showAddIngModal, setShowAddIngModal] = useState<boolean>(false);
  const [newIngNameEn, setNewIngNameEn] = useState<string>('');
  const [newIngNameMm, setNewIngNameMm] = useState<string>('');
  const [newIngCat, setNewIngCat] = useState<string>('Meat');
  const [newIngUnit, setNewIngUnit] = useState<string>('kg');
  const [newIngStock, setNewIngStock] = useState<string>('10');
  const [newIngMin, setNewIngMin] = useState<string>('5');
  const [newIngPrice, setNewIngPrice] = useState<string>('5000');

  // Recipes, Suppliers, POs, Ledger
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stock') {
        const res = await apiRequest<Ingredient[]>('/api/v1/inventory/ingredients');
        setIngredients(res);
      } else if (activeTab === 'recipes') {
        const res = await apiRequest<Recipe[]>('/api/v1/inventory/recipes');
        setRecipes(res);
      } else if (activeTab === 'purchasing') {
        const [sups, pos, ings] = await Promise.all([
          apiRequest<Supplier[]>('/api/v1/inventory/suppliers'),
          apiRequest<PurchaseOrder[]>('/api/v1/inventory/purchase-orders'),
          apiRequest<Ingredient[]>('/api/v1/inventory/ingredients')
        ]);
        setSuppliers(sups);
        setPurchaseOrders(pos);
        setIngredients(ings);
      } else if (activeTab === 'ledger') {
        const res = await apiRequest<StockTransaction[]>('/api/v1/inventory/transactions');
        setTransactions(res);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMMK = (val: number) => `${Math.round(val).toLocaleString()} Ks`;

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustIng) return;

    try {
      const qtyNum = parseFloat(adjustQty);
      const finalQty = adjustType === 'OUT' || adjustType === 'WASTAGE' ? -Math.abs(qtyNum) : Math.abs(qtyNum);

      await apiRequest('/api/v1/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          ingredient_id: adjustIng.id,
          quantity: finalQty,
          transaction_type: adjustType,
          notes: adjustNotes
        })
      });

      setShowAdjustModal(false);
      setAdjustQty('');
      setAdjustNotes('');
      fetchData();
    } catch (err: any) {
      alert(`Adjustment failed: ${err.message || 'Error'}`);
    }
  };

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/inventory/ingredients', {
        method: 'POST',
        body: JSON.stringify({
          name_en: newIngNameEn,
          name_mm: newIngNameMm,
          category: newIngCat,
          unit: newIngUnit,
          current_stock: parseFloat(newIngStock) || 0,
          minimum_stock: parseFloat(newIngMin) || 0,
          purchase_price: parseFloat(newIngPrice) || 0
        })
      });

      setShowAddIngModal(false);
      setNewIngNameEn('');
      setNewIngNameMm('');
      fetchData();
    } catch (err: any) {
      alert(`Failed to add ingredient: ${err.message || 'Error'}`);
    }
  };

  const handleReceivePO = async (poId: number) => {
    try {
      await apiRequest(`/api/v1/inventory/purchase-orders/${poId}/receive`, {
        method: 'PATCH'
      });
      alert('Goods received! Raw ingredient stock updated and purchase recorded.');
      fetchData();
    } catch (err: any) {
      alert(`Failed to receive PO: ${err.message || 'Error'}`);
    }
  };

  const categories = ['ALL', 'Meat', 'Seafood', 'Vegetables', 'Seasoning', 'Dry Goods', 'Beverages'];

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesCat = selectedCategory === 'ALL' || ing.category === selectedCategory;
    const matchesSearch =
      ing.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.name_mm.includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  const lowStockCount = ingredients.filter((i) => i.is_low_stock).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-500" />
            <span>Raw Ingredient Inventory & Recipe Engineering</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time stock monitoring, automatic recipe portion deduction on orders, supplier purchasing, and waste logging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <div className="px-3 py-1.5 bg-red-950/80 border border-red-700/60 rounded-xl text-xs font-bold text-red-300 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{lowStockCount} Ingredients Low in Stock!</span>
            </div>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-2">
        {[
          { id: 'stock', label: 'Ingredient Stock Levels', icon: Scale },
          { id: 'recipes', label: 'Menu Recipe Formulas', icon: BookOpen },
          { id: 'purchasing', label: 'Suppliers & PO Receiving', icon: Truck },
          { id: 'ledger', label: 'Stock Movement Ledger', icon: FileText },
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

      {/* TAB 1: STOCK LEVELS */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Categories */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCategory === c
                      ? 'bg-amber-600 text-black font-bold shadow'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Search and Add */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ingredient..."
                  className="bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 w-48"
                />
              </div>

              <button
                onClick={() => setShowAddIngModal(true)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Add Ingredient</span>
              </button>
            </div>
          </div>

          {/* Ingredients Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredIngredients.map((ing) => (
              <div
                key={ing.id}
                className={`bg-zinc-900 border rounded-2xl p-4 shadow-lg flex flex-col justify-between transition-all ${
                  ing.is_low_stock
                    ? 'border-red-700/80 bg-red-950/20 ring-1 ring-red-600/50'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100">{ing.name_en}</h4>
                      <div className="text-xs text-zinc-400">{ing.name_mm}</div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {ing.category}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-zinc-400">Current Stock:</span>
                      <span className={`text-base font-bold ${ing.is_low_stock ? 'text-red-400' : 'text-emerald-400'}`}>
                        {ing.current_stock.toFixed(2)} {ing.unit}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Min Threshold:</span>
                      <span className="text-zinc-400">{ing.minimum_stock.toFixed(2)} {ing.unit}</span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Unit Cost:</span>
                      <span className="text-zinc-300 font-semibold">{formatMMK(ing.purchase_price)} / {ing.unit}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex gap-2">
                  <button
                    onClick={() => {
                      setAdjustIng(ing);
                      setAdjustType('IN');
                      setShowAdjustModal(true);
                    }}
                    className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg border border-zinc-700 transition"
                  >
                    Adjust Stock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: RECIPE FORMULAS */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs text-zinc-400">
            When an order is paid and marked completed, the system automatically deducts these exact raw ingredient quantities per dish.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-100">{recipe.menu_item_name}</h4>
                    <p className="text-xs text-amber-400 font-medium">{recipe.name}</p>
                  </div>
                  <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded font-bold">
                    {recipe.items.length} Ingredients
                  </span>
                </div>

                {recipe.instructions && (
                  <p className="text-[11px] text-zinc-400 italic bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    "{recipe.instructions}"
                  </p>
                )}

                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  <div className="text-[11px] font-bold text-zinc-400">Portion Formula per Order:</div>
                  {recipe.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-xs py-1 px-2 rounded bg-zinc-950/60 border border-zinc-800/60">
                      <span className="text-zinc-200 font-medium">{it.ingredient_name_en} ({it.ingredient_name_mm})</span>
                      <span className="font-bold text-amber-400">{it.quantity} {it.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PURCHASING & PO RECEIVING */}
      {activeTab === 'purchasing' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" />
              <span>Purchase Orders & Goods Inward</span>
            </h3>

            <div className="space-y-3">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-100">{po.po_number}</span>
                      <span className="text-xs font-semibold text-zinc-300">Supplier: {po.supplier_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        po.status === 'RECEIVED'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-700/60'
                          : 'bg-amber-950 text-amber-400 border-amber-700/60'
                      }`}>
                        {po.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {po.items.map((it, idx) => `${it.ingredient_name} (${it.quantity}x)`).join(' • ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">{formatMMK(po.total_amount)}</div>
                      <span className="text-[10px] text-zinc-500">{new Date(po.created_at).toLocaleDateString()}</span>
                    </div>

                    {po.status !== 'RECEIVED' && (
                      <button
                        onClick={() => handleReceivePO(po.id)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Receive Goods</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Real-Time Inventory Movement Ledger</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Ingredient</th>
                  <th className="py-2.5 px-3">Movement Type</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 text-zinc-400">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-100">{t.ingredient_name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        t.transaction_type === 'AUTO_RECIPE_DEDUCT'
                          ? 'bg-blue-950 text-blue-300 border-blue-700/60'
                          : t.transaction_type === 'IN'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                          : 'bg-red-950 text-red-300 border-red-700/60'
                      }`}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${t.quantity < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {t.quantity > 0 ? `+${t.quantity.toFixed(2)}` : t.quantity.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatMMK(t.unit_cost)}</td>
                    <td className="py-2.5 px-3 text-zinc-400">{t.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && adjustIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-1">Stock Adjustment</h3>
            <p className="text-xs text-zinc-400 mb-4">{adjustIng.name_en} ({adjustIng.name_mm})</p>

            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Adjustment Action</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'IN', label: '+ Stock In' },
                    { id: 'OUT', label: '- Stock Out' },
                    { id: 'WASTAGE', label: 'Waste / Loss' },
                  ].map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAdjustType(a.id)}
                      className={`p-2 rounded-lg text-xs font-semibold border transition ${
                        adjustType === a.id
                          ? 'bg-amber-600 text-black border-amber-500'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Quantity ({adjustIng.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. 5.0"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Routine delivery restock"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg shadow"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Ingredient Modal */}
      {showAddIngModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-3">Add Raw Ingredient</h3>

            <form onSubmit={handleCreateIngredient} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">English Name</label>
                <input
                  type="text"
                  required
                  value={newIngNameEn}
                  onChange={(e) => setNewIngNameEn(e.target.value)}
                  placeholder="e.g. Dried Black Fungus"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Burmese Name</label>
                <input
                  type="text"
                  required
                  value={newIngNameMm}
                  onChange={(e) => setNewIngNameMm(e.target.value)}
                  placeholder="e.g. ကြွက်နားရွက်မှို"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Category</label>
                  <select
                    value={newIngCat}
                    onChange={(e) => setNewIngCat(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                  >
                    {categories.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    placeholder="kg, liter, pcs"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newIngStock}
                    onChange={(e) => setNewIngStock(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Min Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newIngMin}
                    onChange={(e) => setNewIngMin(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Cost / Unit (Ks)</label>
                  <input
                    type="number"
                    value={newIngPrice}
                    onChange={(e) => setNewIngPrice(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddIngModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg shadow"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
