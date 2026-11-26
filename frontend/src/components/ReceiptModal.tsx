import React from 'react';
import { Printer, X, CheckCircle, Store } from 'lucide-react';

export interface ReceiptData {
  restaurant_name: string;
  restaurant_name_mm: string;
  address: string;
  phone: string;
  order_number: string;
  table_number: string;
  order_type: string;
  cashier_name: string;
  waiter_name: string;
  created_at: string;
  paid_at: string;
  items: {
    name_en: string;
    name_mm: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    modifiers?: string;
  }[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  reference_no?: string;
  cash_tendered: number;
  change_returned: number;
  footer_en: string;
  footer_mm: string;
}

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, isOpen, onClose }) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatMMK = (val: number) => `${val.toLocaleString()} Ks`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white text-black w-full max-w-sm rounded-lg shadow-2xl p-6 font-mono text-xs border border-zinc-300 relative print:m-0 print:w-full print:border-none print:shadow-none">
        
        {/* Actions bar (hidden in print) */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-dashed border-zinc-400 print:hidden">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <CheckCircle className="w-4 h-4" />
            <span>Settlement Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print 80mm</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-zinc-600 hover:text-black rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 80mm Thermal Receipt Content */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1 text-sm font-bold tracking-wider">
            <Store className="w-4 h-4" />
            <span>{receipt.restaurant_name}</span>
          </div>
          <div className="text-[11px] font-medium text-zinc-700">{receipt.restaurant_name_mm}</div>
          <div className="text-[10px] text-zinc-600">{receipt.address}</div>
          <div className="text-[10px] text-zinc-600">Tel: {receipt.phone}</div>
        </div>

        <div className="my-3 border-t border-dashed border-zinc-400"></div>

        <div className="text-[10px] space-y-0.5 text-zinc-800">
          <div className="flex justify-between">
            <span>Bill / Order:</span>
            <span className="font-bold">{receipt.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Table / Section:</span>
            <span className="font-bold text-black">{receipt.table_number} ({receipt.order_type})</span>
          </div>
          <div className="flex justify-between">
            <span>Date & Time:</span>
            <span>{new Date(receipt.paid_at).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{receipt.cashier_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Server / Waiter:</span>
            <span>{receipt.waiter_name}</span>
          </div>
        </div>

        <div className="my-2 border-t border-dashed border-zinc-400"></div>

        {/* Itemized Table */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-6 font-bold pb-1 text-[10px] border-b border-zinc-200">
            <span className="col-span-3">Item</span>
            <span className="text-center">Qty</span>
            <span className="col-span-2 text-right">Amount</span>
          </div>

          {receipt.items.map((item, idx) => (
            <div key={idx} className="text-[10px]">
              <div className="grid grid-cols-6 items-baseline">
                <span className="col-span-3 font-semibold truncate">{item.name_en}</span>
                <span className="text-center">x{item.quantity}</span>
                <span className="col-span-2 text-right font-medium">{formatMMK(item.subtotal)}</span>
              </div>
              <div className="text-[9px] text-zinc-500 pl-1">{item.name_mm}</div>
              {item.modifiers && (
                <div className="text-[8px] text-zinc-500 italic pl-1">Note: {item.modifiers}</div>
              )}
            </div>
          ))}
        </div>

        <div className="my-2.5 border-t border-dashed border-zinc-400"></div>

        {/* Financial Breakdown */}
        <div className="text-[10px] space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatMMK(receipt.subtotal)}</span>
          </div>
          {receipt.discount_amount > 0 && (
            <div className="flex justify-between text-zinc-700">
              <span>Discount Applied:</span>
              <span>-{formatMMK(receipt.discount_amount)}</span>
            </div>
          )}
          {receipt.tax_amount > 0 && (
            <div className="flex justify-between">
              <span>Commercial Tax (5%):</span>
              <span>{formatMMK(receipt.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-bold pt-1 border-t border-zinc-300">
            <span>TOTAL AMOUNT:</span>
            <span>{formatMMK(receipt.total_amount)}</span>
          </div>
        </div>

        <div className="my-2.5 border-t border-dashed border-zinc-400"></div>

        {/* Payment Summary */}
        <div className="text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>Payment Method:</span>
            <span className="font-bold">{receipt.payment_method}</span>
          </div>
          {receipt.reference_no && (
            <div className="flex justify-between">
              <span>Ref / Trans ID:</span>
              <span className="font-bold">{receipt.reference_no}</span>
            </div>
          )}
          {receipt.payment_method === 'CASH' && (
            <>
              <div className="flex justify-between">
                <span>Cash Tendered:</span>
                <span>{formatMMK(receipt.cash_tendered)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Change Returned:</span>
                <span>{formatMMK(receipt.change_returned)}</span>
              </div>
            </>
          )}
        </div>

        <div className="my-3 border-t border-dashed border-zinc-400"></div>

        {/* Footer Greetings */}
        <div className="text-center text-[9px] space-y-1 text-zinc-700">
          <p>{receipt.footer_en}</p>
          <p>{receipt.footer_mm}</p>
          <p className="text-[8px] text-zinc-400 pt-1">*** LAW PAN POS SYSTEM v1.0 ***</p>
        </div>

      </div>
    </div>
  );
};
