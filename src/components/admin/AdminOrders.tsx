'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Truck,
  Edit2,
  X,
  Save,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { updateOrderStatus } from '@/lib/dataService';

interface AdminOrdersProps {
  orders: Order[];
  onRefresh: () => void;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string; dot: string }[] = [
  { value: 'pending', label: 'قيد المراجعة', dot: 'bg-amber-500' },
  { value: 'confirmed', label: 'تم التأكيد هاتفياً', dot: 'bg-blue-500' },
  { value: 'processing', label: 'جاري التجهيز بالمخزن', dot: 'bg-indigo-500' },
  { value: 'shipped', label: 'تم التسليم لشركة الشحن', dot: 'bg-purple-500' },
  { value: 'out_for_delivery', label: 'مع المندوب للتسليم', dot: 'bg-cyan-500' },
  { value: 'delivered', label: 'تم التسليم (إيداع الأرباح)', dot: 'bg-emerald-500' },
  { value: 'returned', label: 'مرتجع / لم يستلم', dot: 'bg-rose-500' },
  { value: 'cancelled', label: 'ملغي', dot: 'bg-neutral-400' },
];

export default function AdminOrders({ orders, onRefresh }: AdminOrdersProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Status Change State inside Modal
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [shippingCompany, setShippingCompany] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [loading, setLoading] = useState(false);

  const openOrderModal = (ord: Order) => {
    setSelectedOrder(ord);
    setNewStatus(ord.status);
    setShippingCompany(ord.shippingCompany || 'بوسطة (Bosta)');
    setTrackingNumber(ord.trackingNumber || '');
    setStatusNote(ord.statusNotes || '');
  };

  const handleSaveStatus = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    try {
      await updateOrderStatus(selectedOrder.id, newStatus, {
        shippingCompany: shippingCompany.trim(),
        trackingNumber: trackingNumber.trim(),
        note: statusNote.trim(),
      });
      onRefresh();
      setSelectedOrder(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchSearch =
        !search.trim() ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.customerPhone.includes(search) ||
        o.affiliateName?.toLowerCase().includes(search.toLowerCase()) ||
        o.trackingNumber?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, search]);

  return (
    <div className="space-y-5">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} strokeWidth={1.6} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الطلب، العميل، الهاتف، أو المسوق..."
            className="w-full pr-10 pl-3.5 py-2 rounded-lg bg-neutral-50 border border-border text-xs focus:outline-none focus:border-ink"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-50 border border-border text-xs font-medium text-neutral-700 focus:outline-none focus:border-ink"
          >
            <option value="all">جميع الحالات ({orders.length})</option>
            <option value="pending">قيد المراجعة</option>
            <option value="confirmed">تم التأكيد</option>
            <option value="shipped">جاري الشحن</option>
            <option value="delivered">تم التسليم</option>
            <option value="returned">مرتجع</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
      </div>

      {/* Orders SaaS Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-border text-neutral-500 uppercase font-semibold">
                <th className="py-3 px-3.5">رقم الطلب</th>
                <th className="py-3 px-3.5">المسوق</th>
                <th className="py-3 px-3.5">العميل والمحافظة</th>
                <th className="py-3 px-3.5">المنتجات</th>
                <th className="py-3 px-3.5">المبلغ (COD)</th>
                <th className="py-3 px-3.5">عمولة المسوق</th>
                <th className="py-3 px-3.5">ربح المنصة</th>
                <th className="py-3 px-3.5">شركة الشحن والبوليصة</th>
                <th className="py-3 px-3.5">الحالة</th>
                <th className="py-3 px-3.5 text-center">إدارة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((ord) => {
                const currentOpt = STATUS_OPTIONS.find((s) => s.value === ord.status) || STATUS_OPTIONS[0];
                return (
                  <tr key={ord.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-semibold text-ink num-tabular">
                      {ord.orderNumber}
                    </td>

                    <td className="py-3 px-3.5 text-neutral-700 font-medium">
                      <div>{ord.affiliateName || 'طلب مباشر'}</div>
                      <div className="text-[10px] text-neutral-400 font-mono num-tabular">{ord.affiliatePhone}</div>
                    </td>

                    <td className="py-3 px-3.5 text-ink">
                      <div className="font-semibold">{ord.customerName}</div>
                      <div className="text-[10px] text-neutral-400 font-mono num-tabular">{ord.governorate} • {ord.customerPhone}</div>
                    </td>

                    <td className="py-3 px-3.5 text-neutral-600">
                      <div className="line-clamp-1">{ord.items.map((i) => `${i.name} (×${i.quantity})`).join(', ')}</div>
                    </td>

                    <td className="py-3 px-3.5 font-mono font-bold text-ink num-tabular">
                      {ord.totalAmount} ج.م
                    </td>

                    <td className="py-3 px-3.5 font-mono font-semibold text-emerald-700 num-tabular">
                      +{ord.affiliateCommission} ج.م
                    </td>

                    <td className="py-3 px-3.5 font-mono font-semibold text-neutral-700 num-tabular">
                      +{ord.platformProfit} ج.م
                    </td>

                    <td className="py-3 px-3.5 text-neutral-600">
                      <div className="font-medium text-ink">{ord.shippingCompany || 'لم تحدد'}</div>
                      <div className="text-[10px] font-mono text-brand num-tabular">{ord.trackingNumber || '—'}</div>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
                        <span className={`w-1.5 h-1.5 rounded-full ${currentOpt.dot}`} />
                        <span>{currentOpt.label}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={() => openOrderModal(ord)}
                        className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-ink transition-colors"
                        title="تحديث الحالة واللوجستيات"
                      >
                        <Edit2 size={14} strokeWidth={1.6} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Order Status & Logistics Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 border border-border shadow-md relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
            >
              <X size={16} strokeWidth={1.6} />
            </button>

            <div className="mb-5 pb-3 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-ink bg-neutral-100 px-2 py-0.5 rounded num-tabular">
                  {selectedOrder.orderNumber}
                </span>
                <span className="text-xs text-neutral-500">
                  تحديث حالة الشحن والعمليات
                </span>
              </div>
              <h3 className="text-base font-bold text-ink">
                العميل: {selectedOrder.customerName} ({selectedOrder.customerPhone})
              </h3>
            </div>

            <div className="space-y-4 text-xs font-medium text-neutral-700">
              {/* Status Select */}
              <div>
                <label className="block mb-1.5">تحديث حالة الطلب:</label>
                <select
                  value={newStatus}
                  onChange={(e: any) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-xs font-semibold focus:outline-none focus:border-ink"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {newStatus === 'delivered' && (
                  <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                    سيتم تحويل عمولة المسوق ({selectedOrder.affiliateCommission} ج.م) تلقائياً من الرصيد المعلق إلى الرصيد المتاح للسحب.
                  </p>
                )}
              </div>

              {/* Shipping Company & Tracking */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">شركة الشحن:</label>
                  <input
                    type="text"
                    value={shippingCompany}
                    onChange={(e) => setShippingCompany(e.target.value)}
                    placeholder="بوسطة / أوتو / شيب تايم..."
                    className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
                  />
                </div>

                <div>
                  <label className="block mb-1">رقم البوليصة والتتبع:</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="BOSTA-XXXXXXXX"
                    className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink font-normal"
                  />
                </div>
              </div>

              {/* Status Note */}
              <div>
                <label className="block mb-1">ملاحظة التحديث للعميل والمسوق (اختياري):</label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="تم تسليم الشحنة لشركة الشحن / بانتظار استلام العميل"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
                />
              </div>

              {/* Financial Snapshot */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-border space-y-1 text-neutral-600">
                <div className="flex justify-between">
                  <span>إجمالي التحصيل من العميل:</span>
                  <span className="font-bold text-ink num-tabular">{selectedOrder.totalAmount} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>عمولة المسوق ({selectedOrder.affiliateName || 'أفلييت'}):</span>
                  <span className="font-bold text-emerald-700 num-tabular">+{selectedOrder.affiliateCommission} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>صافي ربح المنصة:</span>
                  <span className="font-bold text-ink num-tabular">+{selectedOrder.platformProfit} ج.م</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-2 rounded-lg border border-border text-neutral-700 text-xs font-medium hover:bg-neutral-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save size={14} strokeWidth={1.6} />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ وتحديث الحالة'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
