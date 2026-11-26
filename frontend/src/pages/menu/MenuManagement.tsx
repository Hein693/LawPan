import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  PlusCircle, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ChefHat, 
  RefreshCw, 
  AlertCircle,
  Tag,
  Filter,
  DollarSign
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { MenuCategory, MenuItem } from '../../types';

export const MenuManagement: React.FC = () => {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showItemModal, setShowItemModal] = useState<boolean>(false);
  const [showCatModal, setShowCatModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form state
  const [formNameEn, setFormNameEn] = useState<string>('');
  const [formNameMm, setFormNameMm] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<number>(1);
  const [formBasePrice, setFormBasePrice] = useState<string>('7500');
  const [formStation, setFormStation] = useState<string>('MAIN_KITCHEN');
  const [formPrepTime, setFormPrepTime] = useState<string>('12');
  const [formDescEn, setFormDescEn] = useState<string>('');
  const [formDescMm, setFormDescMm] = useState<string>('');

  // New Category Form state
  const [newCatEn, setNewCatEn] = useState<string>('');
  const [newCatMm, setNewCatMm] = useState<string>('');

  useEffect(() => {
    loadMenuData();
  }, []);

  const loadMenuData = async () => {
    setLoading(true);
    try {
      const [catsRes, itemsRes] = await Promise.all([
        apiRequest<MenuCategory[]>('/api/v1/menu/categories'),
        apiRequest<MenuItem[]>('/api/v1/menu/items')
      ]);
      setCategories(catsRes);
      setItems(itemsRes);
      if (catsRes.length > 0 && !formCategoryId) {
        setFormCategoryId(catsRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load menu data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const newStatus = !item.is_available;
      await apiRequest(`/api/v1/menu/items/${item.id}/availability?available=${newStatus}`, {
        method: 'PATCH'
      });
      setItems(items.map(i => i.id === item.id ? { ...i, is_available: newStatus } : i));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update availability');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await apiRequest(`/api/v1/menu/items/${itemId}`, { method: 'DELETE' });
      setItems(items.filter(i => i.id !== itemId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete menu item');
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormNameEn('');
    setFormNameMm('');
    setFormBasePrice('7500');
    setFormStation('MAIN_KITCHEN');
    setFormPrepTime('12');
    setFormDescEn('');
    setFormDescMm('');
    setShowItemModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormNameEn(item.name_en);
    setFormNameMm(item.name_mm);
    setFormCategoryId(item.category_id);
    setFormBasePrice(item.base_price.toString());
    setFormStation(item.station);
    setFormPrepTime(item.estimated_prep_time.toString());
    setFormDescEn(item.description_en || '');
    setFormDescMm(item.description_mm || '');
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        category_id: Number(formCategoryId),
        name_en: formNameEn,
        name_mm: formNameMm,
        base_price: parseFloat(formBasePrice) || 0,
        station: formStation,
        estimated_prep_time: parseInt(formPrepTime) || 10,
        description_en: formDescEn,
        description_mm: formDescMm
      };

      if (editingItem) {
        const updated = await apiRequest<MenuItem>(`/api/v1/menu/items/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setItems(items.map(i => i.id === updated.id ? updated : i));
      } else {
        const created = await apiRequest<MenuItem>('/api/v1/menu/items', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setItems([...items, created]);
      }
      setShowItemModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save menu item');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiRequest<MenuCategory>('/api/v1/menu/categories', {
        method: 'POST',
        body: JSON.stringify({
          name_en: newCatEn,
          name_mm: newCatMm,
          display_order: categories.length + 1
        })
      });
      setCategories([...categories, created]);
      setNewCatEn('');
      setNewCatMm('');
      setShowCatModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const formatMMK = (val: number) => `${val.toLocaleString()} Ks`;

  const filteredItems = items.filter(item => {
    if (selectedCategory !== 'ALL' && item.category_id !== selectedCategory) return false;
    if (selectedStation !== 'ALL' && item.station !== selectedStation) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchEn = item.name_en.toLowerCase().includes(q);
      const matchMm = item.name_mm.includes(q);
      if (!matchEn && !matchMm) return false;
    }
    return true;
  });

  const isAuthorizedToManage = currentUser?.role === 'OWNER' || currentUser?.role === 'MANAGER';
  const isOwner = currentUser?.role === 'OWNER';

  return (
    <div className="space-y-6">
      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-zinc-100">Chinese Menu Catalog & Prices</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Bilingual English & Myanmar menu items, preparation stations, size variants, and live availability toggling.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAuthorizedToManage && (
            <>
              <button
                onClick={() => setShowCatModal(true)}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-700 transition"
              >
                + Add Category
              </button>

              <button
                onClick={openCreateModal}
                className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Menu Item</span>
              </button>
            </>
          )}

          <button
            onClick={loadMenuData}
            disabled={loading}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Bilingual Search Input */}
        <div className="md:col-span-8 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dish by English or Myanmar name (e.g. Fried Rice, ဟာကောင်, Kung Pao)..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition shadow"
          />
        </div>

        {/* Station Selector */}
        <div className="md:col-span-4">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 transition shadow"
          >
            <option value="ALL">All Kitchen Stations</option>
            <option value="MAIN_KITCHEN">Main Kitchen (ပင်မမီးဖို)</option>
            <option value="NOODLE_STATION">Noodle Station (ခေါက်ဆွဲဌာန)</option>
            <option value="RICE_STATION">Rice Station (ထမင်းဌာန)</option>
            <option value="DIM_SUM_STATION">Dim Sum Station (ဒင်ဆမ်းဌာန)</option>
            <option value="DRINKS_STATION">Drinks & Bar Station (အဖျော်ယမကာ)</option>
          </select>
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
            selectedCategory === 'ALL'
              ? 'bg-amber-600 text-black shadow-lg font-bold'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          All Items ({items.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl transition whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-amber-600 text-black shadow-lg font-bold'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {language === 'mm' ? cat.name_mm : cat.name_en} ({cat.items_count || 0})
          </button>
        ))}
      </div>

      {/* Menu Items Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-zinc-900 border rounded-2xl p-4 shadow-xl flex flex-col justify-between transition-all relative ${
              item.is_available 
                ? 'border-zinc-800 hover:border-zinc-700' 
                : 'border-red-950/80 bg-zinc-950/60 opacity-75'
            }`}
          >
            <div>
              {/* Category & Station Badges */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 truncate">
                  {item.station}
                </span>

                <button
                  onClick={() => handleToggleAvailability(item)}
                  title={item.is_available ? 'Mark 86 / Sold Out' : 'Mark Available'}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                    item.is_available
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                      : 'bg-red-950/80 border-red-700 text-red-300'
                  }`}
                >
                  {item.is_available ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>In Stock</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-red-400" />
                      <span>86 / Sold Out</span>
                    </>
                  )}
                </button>
              </div>

              {/* Title and Descriptions */}
              <h3 className="text-sm font-bold text-zinc-100 line-clamp-1">{item.name_en}</h3>
              <p className="text-xs text-amber-400/90 font-medium mt-0.5 line-clamp-1">{item.name_mm}</p>
              
              <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2 min-h-[32px]">
                {language === 'mm' ? (item.description_mm || item.description_en) : (item.description_en || item.description_mm)}
              </p>

              {/* Variants Pill list if available */}
              {item.variants && item.variants.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {item.variants.map((v) => (
                    <span key={v.id} className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                      {v.name} {v.price_adjustment > 0 ? `(+${v.price_adjustment.toLocaleString()})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom: Price, Prep Time, and Actions */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-sm font-black text-emerald-400">{formatMMK(item.base_price)}</span>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{item.estimated_prep_time} mins</span>
                </div>
              </div>

              {isAuthorizedToManage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    title="Edit Item"
                    className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {isOwner && (
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      title="Delete Item"
                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-12 text-center text-xs text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800">
          <UtensilsCrossed className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          No menu items match your search or filter selection.
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-red-500" />
              {editingItem ? 'Edit Chinese Menu Item' : 'Add New Chinese Menu Item'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Configure product bilingual names, base MMK price, kitchen preparation station, and description.
            </p>

            <form onSubmit={handleSaveItem} className="space-y-4 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Name (English)</label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    placeholder="e.g. Kung Pao Chicken"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Name (Burmese / မြန်မာ)</label>
                  <input
                    type="text"
                    value={formNameMm}
                    onChange={(e) => setFormNameMm(e.target.value)}
                    placeholder="e.g. ကုန်းဘောင် ကြက်သားကြော်"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_en} ({c.name_mm})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Base Price (MMK / ကျပ်)</label>
                  <input
                    type="number"
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(e.target.value)}
                    placeholder="e.g. 8500"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Preparation Station</label>
                  <select
                    value={formStation}
                    onChange={(e) => setFormStation(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="MAIN_KITCHEN">Main Kitchen (ပင်မမီးဖို)</option>
                    <option value="NOODLE_STATION">Noodle Station (ခေါက်ဆွဲဌာန)</option>
                    <option value="RICE_STATION">Rice Station (ထမင်းဌာန)</option>
                    <option value="DIM_SUM_STATION">Dim Sum Station (ဒင်ဆမ်းဌာန)</option>
                    <option value="DRINKS_STATION">Drinks & Bar (အဖျော်ယမကာ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Estimated Prep Time (Minutes)</label>
                  <input
                    type="number"
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Description (English)</label>
                <textarea
                  value={formDescEn}
                  onChange={(e) => setFormDescEn(e.target.value)}
                  placeholder="Ingredients, culinary style, flavor profile..."
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Description (Burmese / မြန်မာ)</label>
                <textarea
                  value={formDescMm}
                  onChange={(e) => setFormDescMm(e.target.value)}
                  placeholder="ဟင်းလျာအကြောင်း ဖော်ပြချက်..."
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition shadow"
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-400" />
              Add Menu Category
            </h3>

            <form onSubmit={handleCreateCategory} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Category Name (English)</label>
                <input
                  type="text"
                  value={newCatEn}
                  onChange={(e) => setNewCatEn(e.target.value)}
                  placeholder="e.g. Seafood Delicacies"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Category Name (Burmese / မြန်မာ)</label>
                <input
                  type="text"
                  value={newCatMm}
                  onChange={(e) => setNewCatMm(e.target.value)}
                  placeholder="e.g. ပင်လယ်စာ အထူးဟင်းလျာများ"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition shadow"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
