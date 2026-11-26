import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Send, 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ShoppingBag,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { MenuCategory, MenuItem, RestaurantTable } from '../../types';

interface CartItem {
  cart_id: string;
  menu_item_id: number;
  name_en: string;
  name_mm: string;
  base_price: number;
  unit_price: number;
  quantity: number;
  variant_name?: string;
  variant_price_adjustment: number;
  special_instructions?: string;
  station: string;
}

export const POSOrderScreen: React.FC<{ onOrderSubmitted?: () => void }> = ({ onOrderSubmitted }) => {
  const { t, language } = useLanguage();
  const { currentUser } = useAuth();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);

  // Item Modifier Modal
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('Regular');
  const [variantAdjustment, setVariantAdjustment] = useState<number>(0);
  const [specialNote, setSpecialNote] = useState<string>('');
  const [modalQty, setModalQty] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catsRes, itemsRes, tablesRes] = await Promise.all([
        apiRequest<MenuCategory[]>('/api/v1/menu/categories'),
        apiRequest<MenuItem[]>('/api/v1/menu/items?available_only=true'),
        apiRequest<{ tables: RestaurantTable[] }>('/api/v1/dashboard/waiter').then(res => res.tables)
      ]);
      setCategories(catsRes);
      setItems(itemsRes);
      setTables(tablesRes);
      if (tablesRes.length > 0 && !selectedTableId) {
        setSelectedTableId(tablesRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModifierModal = (item: MenuItem) => {
    setModalItem(item);
    setModalQty(1);
    setSpecialNote('');
    if (item.variants && item.variants.length > 0) {
      setSelectedVariant(item.variants[0].name);
      setVariantAdjustment(item.variants[0].price_adjustment);
    } else {
      setSelectedVariant('Regular');
      setVariantAdjustment(0);
    }
  };

  const handleAddToCart = () => {
    if (!modalItem) return;

    const unitPrice = modalItem.base_price + variantAdjustment;
    const cartId = `${modalItem.id}-${selectedVariant}-${specialNote}`;

    const existingIndex = cart.findIndex(c => c.cart_id === cartId);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += modalQty;
      setCart(updated);
    } else {
      const newItem: CartItem = {
        cart_id: cartId,
        menu_item_id: modalItem.id,
        name_en: modalItem.name_en,
        name_mm: modalItem.name_mm,
        base_price: modalItem.base_price,
        unit_price: unitPrice,
        quantity: modalQty,
        variant_name: selectedVariant !== 'Regular' ? selectedVariant : undefined,
        variant_price_adjustment: variantAdjustment,
        special_instructions: specialNote.trim() ? specialNote.trim() : undefined,
        station: modalItem.station
      };
      setCart([...cart, newItem]);
    }

    setModalItem(null);
  };

  const updateCartQty = (cartId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.cart_id === cartId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(c => c.cart_id !== cartId));
  };

  const subtotal = cart.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);
  const tax = subtotal * 0.05; // 5% commercial tax
  const total = subtotal + tax;

  const handleSubmitOrder = async () => {
    if (!selectedTableId) {
      alert('Please select a dining table for this order.');
      return;
    }
    if (cart.length === 0) {
      alert('Order cart is empty. Add dishes before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        table_id: selectedTableId,
        items: cart.map(c => ({
          menu_item_id: c.menu_item_id,
          quantity: c.quantity,
          variant_name: c.variant_name,
          variant_price_adjustment: c.variant_price_adjustment,
          special_instructions: c.special_instructions
        })),
        notes: orderNotes
      };

      const res = await apiRequest<any>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSuccessOrderNumber(res.order_number);
      setCart([]);
      setOrderNotes('');
      // Refresh tables to reflect occupancy
      loadData();
      if (onOrderSubmitted) onOrderSubmitted();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const quickInstructions = [
    { en: 'Less Spicy', mm: 'အစပ်လျှော့' },
    { en: 'No MSG', mm: 'အချိုမှုန့်မထည့်ပါနှင့်' },
    { en: 'Extra Scallions', mm: 'ကြက်သွန်မြိတ်များများ' },
    { en: 'Separate Sauce', mm: 'အချဉ်ရည်သီးသန့်ခွဲပေးပါ' },
    { en: 'Less Oil', mm: 'ဆီလျှော့' }
  ];

  const formatMMK = (val: number) => `${val.toLocaleString()} Ks`;

  const filteredItems = items.filter(it => {
    if (selectedCategory !== 'ALL' && it.category_id !== selectedCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!it.name_en.toLowerCase().includes(q) && !it.name_mm.includes(q)) return false;
    }
    return true;
  });

  const selectedTable = tables.find(t => t.id === selectedTableId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Cols: Food Menu & Categories */}
      <div className="lg:col-span-8 space-y-4">
        {/* Table & Server Header Bar */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-black font-bold text-sm">
              {selectedTable?.table_number || 'T-??'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100">Touch POS Order Station</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-semibold">
                  LIVE POS
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Server: <strong className="text-zinc-200">{currentUser?.name}</strong> • Table: {selectedTable?.section} (Seats {selectedTable?.capacity})
              </p>
            </div>
          </div>

          {/* Table Selector Dropdown */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-400" />
            <select
              value={selectedTableId || ''}
              onChange={(e) => setSelectedTableId(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-bold focus:outline-none"
            >
              {tables.map(t => (
                <option key={t.id} value={t.id}>
                  {t.table_number} ({t.status}) - {t.section}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dish (e.g. Fried Rice, ပုစွန်ပေါင်း, Chow Mein, Chicken)..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 shadow"
          />
        </div>

        {/* Category Pills Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-amber-600 text-black shadow-lg'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            All Categories
          </button>

          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition whitespace-nowrap ${
                selectedCategory === c.id
                  ? 'bg-amber-600 text-black shadow-lg font-bold'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {language === 'mm' ? c.name_mm : c.name_en}
            </button>
          ))}
        </div>

        {/* Dishes Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => openModifierModal(item)}
              className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/80 p-3.5 rounded-2xl cursor-pointer transition shadow-lg hover:scale-[1.01] flex flex-col justify-between group"
            >
              <div>
                <span className="text-[10px] text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  {item.station}
                </span>

                <h3 className="font-bold text-xs text-zinc-100 mt-2 line-clamp-1 group-hover:text-amber-400 transition-colors">
                  {item.name_en}
                </h3>
                <p className="text-[11px] text-amber-400/90 font-medium line-clamp-1">{item.name_mm}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400">{formatMMK(item.base_price)}</span>
                <span className="w-6 h-6 rounded-lg bg-red-950 text-red-300 border border-red-800 flex items-center justify-center text-xs font-bold group-hover:bg-red-700 group-hover:text-white transition">
                  +
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right 4 Cols: Live Order Cart & Kitchen Dispatch */}
      <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between min-h-[600px] sticky top-20">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-zinc-100">Order Cart</h3>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              {cart.reduce((a, b) => a + b.quantity, 0)} Items
            </span>
          </div>

          {/* Success Banner */}
          {successOrderNumber && (
            <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <div>
                <span className="font-bold">Order Submitted!</span>
                <p className="text-[11px] mt-0.5 font-mono">{successOrderNumber}</p>
              </div>
              <button 
                onClick={() => setSuccessOrderNumber(null)}
                className="text-[10px] text-emerald-400 underline font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Cart Items List */}
          <div className="divide-y divide-zinc-800/80 max-h-[380px] overflow-y-auto mt-2 pr-1">
            {cart.map(c => (
              <div key={c.cart_id} className="py-3 flex items-start justify-between gap-2 text-xs">
                <div className="flex-1">
                  <h4 className="font-bold text-zinc-200">{c.name_en}</h4>
                  <p className="text-[10px] text-amber-400 font-medium">{c.name_mm}</p>
                  
                  {c.variant_name && (
                    <span className="inline-block text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded mt-0.5">
                      {c.variant_name}
                    </span>
                  )}
                  {c.special_instructions && (
                    <p className="text-[10px] text-red-400 italic mt-0.5">Note: {c.special_instructions}</p>
                  )}

                  <div className="text-[11px] text-emerald-400 font-bold mt-1">
                    {formatMMK(c.unit_price * c.quantity)}
                  </div>
                </div>

                {/* Qty Controls */}
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button 
                    onClick={() => updateCartQty(c.cart_id, -1)}
                    className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-xs">{c.quantity}</span>
                  <button 
                    onClick={() => updateCartQty(c.cart_id, 1)}
                    className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && !successOrderNumber && (
              <div className="p-10 text-center text-xs text-zinc-500">
                <UtensilsCrossed className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                Cart is empty. Select dishes from the menu to start order.
              </div>
            )}
          </div>

          {/* Kitchen Order Special Instructions */}
          {cart.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Table Notes / Special Serving Request
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Serve dim sum first, bring extra chili oil..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100"
              />
            </div>
          )}
        </div>

        {/* Cart Bottom Summary & Submit Button */}
        {cart.length > 0 && (
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <div className="text-xs space-y-1 text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-zinc-200">{formatMMK(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Commercial Tax (5%):</span>
                <span>{formatMMK(tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-zinc-100 pt-1 border-t border-zinc-800">
                <span>Total Amount:</span>
                <span className="text-emerald-400">{formatMMK(total)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="w-full py-3 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition shadow-xl flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting to Kitchen...' : 'Send Order to Kitchen (မီးဖိုချောင်သို့ပို့မည်)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Touch Modifier Modal */}
      {modalItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div>
              <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                {modalItem.station}
              </span>
              <h3 className="text-base font-bold text-zinc-100 mt-1">{modalItem.name_en}</h3>
              <p className="text-xs text-amber-400 font-semibold">{modalItem.name_mm}</p>
              <p className="text-sm font-black text-emerald-400 mt-1">{formatMMK(modalItem.base_price)}</p>
            </div>

            {/* Size Variants (if configured) */}
            {modalItem.variants && modalItem.variants.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Portion / Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {modalItem.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariant(v.name);
                        setVariantAdjustment(v.price_adjustment);
                      }}
                      className={`p-2.5 rounded-xl text-xs font-medium border text-left transition ${
                        selectedVariant === v.name
                          ? 'bg-amber-600 text-black border-amber-500 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span className="block font-bold">{v.name}</span>
                      <span className="text-[10px] opacity-80">
                        {v.price_adjustment > 0 ? `+${formatMMK(v.price_adjustment)}` : 'Standard'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Cooking Instructions */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Cooking Instructions</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {quickInstructions.map(qi => (
                  <button
                    key={qi.en}
                    onClick={() => {
                      const text = language === 'mm' ? qi.mm : qi.en;
                      setSpecialNote(prev => prev ? `${prev}, ${text}` : text);
                    }}
                    className="text-[10px] px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition"
                  >
                    + {language === 'mm' ? qi.mm : qi.en}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                placeholder="Custom cooking instruction (e.g. less salt, extra hot)..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-xs font-semibold text-zinc-300">Quantity</span>
              <div className="flex items-center gap-3 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                  className="text-zinc-400 hover:text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm w-6 text-center">{modalQty}</span>
                <button 
                  onClick={() => setModalQty(modalQty + 1)}
                  className="text-zinc-400 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setModalItem(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition shadow"
              >
                Add to Cart ({formatMMK((modalItem.base_price + variantAdjustment) * modalQty)})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
