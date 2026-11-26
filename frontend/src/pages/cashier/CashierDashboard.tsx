import React, { useState, useEffect } from 'react';
import { 
  CircleDollarSign, 
  CreditCard, 
  DollarSign, 
  Receipt, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  Printer, 
  Clock, 
  QrCode,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { ReceiptModal, type ReceiptData } from '../../components/ReceiptModal';

interface UnpaidOrder {
  id: number;
  order_number: string;
  order_type: string;
  status: string;
  table_id: number | null;
  table_number: string;
  waiter_id: number;
  waiter_name: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  items_count: number;
  created_at: string;
}

interface ReconciliationData {
  date: string;
  cash_drawer: number;
  kpay_received: number;
  wave_received: number;
  card_received: number;
  total_received: number;
  refunded_amount: number;
  net_revenue: number;
  total_transactions: number;
}

export const CashierDashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const [unpaidOrders, setUnpaidOrders] = useState<UnpaidOrder[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  
  // Selected Order for Payment
  const [selectedOrder, setSelectedOrder] = useState<UnpaidOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'KPAY' | 'WAVE_MONEY' | 'CARD' | 'SPLIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  
  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);
  const [refundPaymentId, setRefundPaymentId] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundError, setRefundError] = useState<string>('');

  useEffect(() => {
    fetchCashierData();
  }, []);

  const fetchCashierData = async () => {
    setLoading(true);
    try {
      const [orders, recon] = await Promise.all([
        apiRequest<UnpaidOrder[]>('/api/v1/billing/unpaid'),
        apiRequest<ReconciliationData>('/api/v1/billing/drawer-reconciliation')
      ]);
      setUnpaidOrders(orders);
      setReconciliation(recon);
      if (selectedOrder) {
        const stillUnpaid = orders.find(o => o.id === selectedOrder.id);
        if (!stillUnpaid) setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Failed to load cashier data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMMK = (val: number) => `${Math.round(val).toLocaleString()} Ks`;

  const orderSubtotal = selectedOrder ? selectedOrder.subtotal : 0;
  const discountAmount = selectedOrder ? (orderSubtotal * discountPercent) / 100 : 0;
  const orderTotal = Math.max(0, orderSubtotal - discountAmount);
  const changeReturned = Math.max(0, (parseFloat(cashTendered) || 0) - orderTotal);

  const handleProcessPayment = async () => {
    if (!selectedOrder) return;

    if (paymentMethod === 'CASH') {
      const tendered = parseFloat(cashTendered) || 0;
      if (tendered < orderTotal) {
        alert(`Cash tendered (${formatMMK(tendered)}) is less than total due (${formatMMK(orderTotal)})`);
        return;
      }
    }

    if ((paymentMethod === 'KPAY' || paymentMethod === 'WAVE_MONEY') && !referenceNo.trim()) {
      alert('Please enter customer transaction reference last 4 digits / transaction ID.');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        order_id: selectedOrder.id,
        payment_method: paymentMethod,
        cash_tendered: paymentMethod === 'CASH' ? (parseFloat(cashTendered) || orderTotal) : orderTotal,
        reference_no: referenceNo.trim() || undefined,
        discount_percent: discountPercent
      };

      await apiRequest('/api/v1/billing/pay', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Fetch formatted receipt
      const receipt = await apiRequest<ReceiptData>(`/api/v1/billing/receipt/${selectedOrder.id}`);
      setReceiptData(receipt);
      setShowReceipt(true);

      // Reset state and refresh
      setSelectedOrder(null);
      setCashTendered('');
      setReferenceNo('');
      setDiscountPercent(0);
      await fetchCashierData();
    } catch (err: any) {
      alert(`Payment failed: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefundError('');
    try {
      await apiRequest('/api/v1/billing/refund', {
        method: 'POST',
        body: JSON.stringify({
          payment_id: parseInt(refundPaymentId),
          amount: parseFloat(refundAmount),
          reason: refundReason
        })
      });
      alert('Refund processed and inventory stock restored successfully.');
      setShowRefundModal(false);
      setRefundPaymentId('');
      setRefundAmount('');
      setRefundReason('');
      await fetchCashierData();
    } catch (err: any) {
      setRefundError(err.message || 'Refund failed. Authorization required.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-blue-400" />
            <span>Cashier & Settlement Counter</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Process bill payments, record KPay/Wave transactions, print 80mm receipts, and balance cash drawer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRefundModal(true)}
            className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 text-xs font-semibold rounded-lg border border-red-700/60 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Process Refund</span>
          </button>

          <button
            onClick={fetchCashierData}
            disabled={loading}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Bills</span>
          </button>
        </div>
      </div>

      {/* Daily Cash Reconciliation Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-zinc-400">Physical Cash Drawer</span>
          <div className="text-base font-bold text-emerald-400 mt-1">
            {formatMMK(reconciliation?.cash_drawer || 0)}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-zinc-400">KBZPay (KPay) Total</span>
          <div className="text-base font-bold text-blue-400 mt-1">
            {formatMMK(reconciliation?.kpay_received || 0)}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-zinc-400">Wave Money Total</span>
          <div className="text-base font-bold text-amber-400 mt-1">
            {formatMMK(reconciliation?.wave_received || 0)}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-zinc-400">Net Revenue Settled</span>
          <div className="text-base font-bold text-zinc-100 mt-1">
            {formatMMK(reconciliation?.net_revenue || 0)}
          </div>
        </div>
      </div>

      {/* Main Cashier Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Unpaid Bills Queue */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Unpaid Customer Orders</h3>
              <p className="text-xs text-zinc-400">Select any order to settle bill and print receipt</p>
            </div>
            <span className="text-xs bg-red-950/80 border border-red-700/60 text-red-300 px-2 py-0.5 rounded font-medium">
              {unpaidOrders.length} Pending Payment
            </span>
          </div>

          <div className="space-y-2">
            {unpaidOrders.length > 0 ? (
              unpaidOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setCashTendered(order.total_amount.toString());
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-zinc-800 border-amber-500 shadow-lg ring-1 ring-amber-500/50'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-100">{order.order_number}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-700/60">
                          {order.table_number}
                        </span>
                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {order.order_type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Server: {order.waiter_name} • {order.items_count} items • {order.created_at ? new Date(order.created_at).toLocaleTimeString() : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-emerald-400">{formatMMK(order.total_amount)}</div>
                      <span className="text-[10px] text-amber-400 font-medium">Click to Settle &gt;</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                All orders are currently settled and paid. No outstanding bills!
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment Settlement & Receipt Terminal */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-amber-400" />
              Bill Payment Processing
            </h3>

            {selectedOrder ? (
              <div className="space-y-4">
                <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Order Ref:</span>
                    <span className="font-bold text-zinc-200">{selectedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Table:</span>
                    <span className="font-bold text-amber-400">{selectedOrder.table_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Subtotal:</span>
                    <span className="font-semibold text-zinc-200">{formatMMK(orderSubtotal)}</span>
                  </div>

                  {/* Discount percentage selector */}
                  <div className="pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-zinc-400">Apply Discount:</span>
                      <span className="text-amber-400 font-bold">{discountPercent}%</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 5, 10, 15, 20].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDiscountPercent(d)}
                          className={`flex-1 py-1 text-[11px] font-semibold rounded border transition ${
                            discountPercent === d
                              ? 'bg-amber-600 text-black border-amber-500'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                          }`}
                        >
                          {d}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-400 pt-1">
                      <span>Discount Amount:</span>
                      <span>-{formatMMK(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm font-bold">
                    <span className="text-zinc-200">Total Amount Due:</span>
                    <span className="text-emerald-400 text-base">{formatMMK(orderTotal)}</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'CASH', label: 'Cash (ငွေသား)' },
                      { id: 'KPAY', label: 'KBZPay (KPay)' },
                      { id: 'WAVE_MONEY', label: 'Wave Money' },
                      { id: 'CARD', label: 'POS Card' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m.id as any);
                          if (m.id === 'CASH') {
                            setCashTendered(orderTotal.toString());
                          }
                        }}
                        className={`p-2.5 rounded-lg text-xs font-medium border text-left transition ${
                          paymentMethod === m.id
                            ? 'bg-amber-600 text-black border-amber-500 font-bold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Drawer Calculator */}
                {paymentMethod === 'CASH' && (
                  <div className="space-y-2 bg-zinc-950/70 p-3 rounded-lg border border-zinc-800">
                    <label className="block text-xs text-zinc-400">Cash Received from Customer (Ks)</label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-bold text-right"
                    />
                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-zinc-400">Change to Return:</span>
                      <span className="font-bold text-amber-400 text-sm">{formatMMK(changeReturned)}</span>
                    </div>
                  </div>
                )}

                {/* Mobile Payment Manual Reference */}
                {(paymentMethod === 'KPAY' || paymentMethod === 'WAVE_MONEY') && (
                  <div className="space-y-2 bg-zinc-950/70 p-3 rounded-lg border border-zinc-800">
                    <label className="block text-xs text-zinc-400">
                      Customer Transaction Last 4 Digits / Ref No.
                    </label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="e.g. 8921"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                    />
                    <p className="text-[10px] text-zinc-500">
                      Confirm merchant SMS notification before completing settlement.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800">
                Please select an unpaid order from the left to begin payment settlement.
              </div>
            )}
          </div>

          {selectedOrder && (
            <div className="space-y-2 pt-3 border-t border-zinc-800">
              <button
                disabled={processing}
                onClick={handleProcessPayment}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-800 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>{processing ? 'Processing Settlement...' : 'Confirm Payment & Print Receipt'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        receipt={receiptData}
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
      />

      {/* Manager Authorized Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 mb-2">
              <RotateCcw className="w-5 h-5 text-red-400" />
              <span>Issue Customer Refund</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Restricted to Manager or Owner. Approving a refund restores stock to the inventory.
            </p>

            {refundError && (
              <div className="p-3 bg-red-950/50 border border-red-700/60 rounded-lg text-xs text-red-300 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{refundError}</span>
              </div>
            )}

            <form onSubmit={handleProcessRefund} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Payment ID</label>
                <input
                  type="number"
                  required
                  value={refundPaymentId}
                  onChange={(e) => setRefundPaymentId(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Refund Amount (Ks)</label>
                <input
                  type="number"
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Reason for Refund</label>
                <textarea
                  required
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Guest had urgent flight departure"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
                >
                  Authorize Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
