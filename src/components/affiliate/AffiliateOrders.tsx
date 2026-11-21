'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Phone,
  MapPin,
  Calendar,
  Truck,
  ArrowUpRight,
} from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface AffiliateOrdersProps {
  orders: Order[];
}

const STATUS_MAP: Record<OrderStatus, { label_ar: string; label_en: string; dot: string; textColor: string }> = {
  pending: { label_ar: 'قيد المراجعة', label_en: 'Pending', dot: 'bg-amber-500', textColor: 'text-amber-800' },
  confirmed: { label_ar: 'تم التأكيد هاتفياً', label_en: 'Confirmed', dot: 'bg-blue-500', textColor: 'text-blue-800' },
  processing: { label_ar: 'جاري التجهيز بالمخزن', label_en: 'Processing', dot: 'bg-indigo-500', textColor: 'text-indigo-800' },
  shipped: { label_ar: 'مع شركة الشحن', label_en: 'Shipped', dot: 'bg-purple-500', textColor: 'text-purple-800' },
  out_for_delivery: { label_ar: 'مع المندوب للتسليم', label_en: 'Out for Delivery', dot: 'bg-cyan-500', textColor: 'text-cyan-800' },
  delivered: { label_ar: 'تم التسليم', label_en: 'Delivered', dot: 'bg-emerald-500', textColor: 'text-emerald-800' },
  returned: { label_ar: 'مرتجع', label_en: 'Returned', dot: 'bg-rose-500', textColor: 'text-rose-800' },
  cancelled: { label_ar: 'ملغي', label_en: 'Cancelled', dot: 'bg-neutral-400', textColor: 'text-neutral-600' },
};

export default function AffiliateOrders({ orders }: AffiliateOrdersProps) {
  const { locale } = useLanguage();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;
      const matchesSearch =
        !search.trim() ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.customerPhone.includes(search) ||
        o.trackingNumber?.toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [orders, selectedStatus, search]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      shipped: orders.filter((o) => o.status === 'shipped' || o.status === 'out_for_delivery').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      returned: orders.filter((o) => o.status === 'returned').length,
    };
  }, [orders]);

  return (
    <div className="space-y-5">
      {/* Search & Tabs */}
      <div className="bg-white p-4 rounded-xl border border-border space-y-3">
        {/* Search */}
        <div className="relative max-w-md">
          <Search size={16} strokeWidth={1.6} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث برقم الطلب، اسم العميل، الهاتف...' : 'Search by order#, name, phone...'}
            className="w-full pr-10 pl-3.5 py-2 rounded-lg bg-neutral-50 border border-border text-xs focus:outline-none focus:border-ink"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          {[
            { id: 'all', label: 'الكل', count: counts.all },
            { id: 'pending', label: 'قيد المراجعة', count: counts.pending },
            { id: 'confirmed', label: 'مؤكد هاتفياً', count: counts.confirmed },
            { id: 'shipped', label: 'جاري الشحن', count: counts.shipped },
            { id: 'delivered', label: 'تم التسليم والأرباح', count: counts.delivered },
            { id: 'returned', label: 'مرتجع', count: counts.returned },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedStatus === tab.id
                  ? 'bg-ink text-white font-semibold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-ink'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono num-tabular ${
                  selectedStatus === tab.id ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-border">
          <Package size={36} strokeWidth={1.4} className="mx-auto text-neutral-300 mb-2" />
          <h4 className="text-sm font-semibold text-ink mb-1">لا توجد طلبات مسجلة بهذا الفلتر</h4>
          <p className="text-xs text-neutral-400">يمكنك تسجيل طلب جديد لعميلك في أي وقت</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((ord) => {
            const st = STATUS_MAP[ord.status] || STATUS_MAP.pending;
            return (
              <div
                key={ord.id}
                className="bg-white rounded-xl border border-border p-4.5 transition-colors hover:border-neutral-300"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono bg-neutral-100 text-ink px-2.5 py-1 rounded-md num-tabular">
                      {ord.orderNumber}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-2.5 py-0.5 rounded-md">
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      <span>{locale === 'ar' ? st.label_ar : st.label_en}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span className="flex items-center gap-1" suppressHydrationWarning>
                      <Calendar size={13} strokeWidth={1.6} />
                      <span className="num-tabular">{new Date(ord.createdAt).toLocaleDateString('ar-EG')}</span>
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-md border border-emerald-200 num-tabular">
                      عمولتك: +{ord.affiliateCommission} ج.م
                    </span>
                  </div>
                </div>

                {/* Body Row: Customer & Order Items */}
                <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Customer Info */}
                  <div className="space-y-1 bg-neutral-50/70 p-3 rounded-lg border border-border">
                    <p className="font-semibold text-ink text-xs">
                      {ord.customerName}
                    </p>
                    <p className="text-neutral-500 flex items-center gap-1.5">
                      <Phone size={12} strokeWidth={1.6} className="text-neutral-400" />
                      <span className="font-mono num-tabular">{ord.customerPhone}</span>
                      {ord.customerPhone2 && <span className="font-mono text-neutral-400 num-tabular">/ {ord.customerPhone2}</span>}
                    </p>
                    <p className="text-neutral-500 flex items-center gap-1.5">
                      <MapPin size={12} strokeWidth={1.6} className="text-neutral-400" />
                      <span>{ord.governorate} - {ord.customerCity} - {ord.customerAddress}</span>
                    </p>
                    {ord.notes && (
                      <p className="text-neutral-500 italic mt-1 bg-white p-1.5 rounded border border-border text-[11px]">
                        ملاحظات المندوب: {ord.notes}
                      </p>
                    )}
                  </div>

                  {/* Logistics & Tracking */}
                  <div className="space-y-1.5 bg-neutral-50/70 p-3 rounded-lg border border-border flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-neutral-500">شركة الشحن:</span>
                        <span className="font-semibold text-ink">{ord.shippingCompany || 'جاري التعيين'}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-neutral-500">رقم بوليصة التتبع:</span>
                        <span className="font-mono font-semibold text-brand num-tabular">{ord.trackingNumber || 'بانتظار البوليصة'}</span>
                      </div>
                      <div className="flex justify-between items-center text-neutral-700 pt-1 border-t border-border">
                        <span>إجمالي التحصيل كاش (COD):</span>
                        <span className="font-bold text-xs text-ink num-tabular">{ord.totalAmount} ج.م</span>
                      </div>
                    </div>

                    {ord.statusNotes && (
                      <div className="text-[11px] text-neutral-600 bg-amber-50 p-2 rounded border border-amber-200 mt-1">
                        آخر تحديث للشحنة: {ord.statusNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Summary list */}
                <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-neutral-400 font-medium text-[11px]">المنتجات:</span>
                  {ord.items.map((it, idx) => (
                    <span key={idx} className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded text-[11px] font-medium">
                      {it.name} (مقاس {it.size}) × {it.quantity}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
