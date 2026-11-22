'use client';

import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Wallet,
  Truck,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import type { Order, Product, Marketer, WithdrawalRequest } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdminDashboardProps {
  orders: Order[];
  products: Product[];
  marketers: Marketer[];
  withdrawals: WithdrawalRequest[];
  onNavigateTab: (tab: any) => void;
}

const STATUS_MAP: Record<string, { label: string; dot: string }> = {
  pending: { label: 'قيد المراجعة', dot: 'bg-amber-500' },
  confirmed: { label: 'تم التأكيد', dot: 'bg-blue-500' },
  processing: { label: 'جاري التجهيز', dot: 'bg-indigo-500' },
  shipped: { label: 'جاري الشحن', dot: 'bg-purple-500' },
  out_for_delivery: { label: 'مع المندوب', dot: 'bg-cyan-500' },
  delivered: { label: 'تم التسليم', dot: 'bg-emerald-500' },
  returned: { label: 'مرتجع', dot: 'bg-rose-500' },
  cancelled: { label: 'ملغي', dot: 'bg-neutral-400' },
};

export default function AdminDashboard({
  orders,
  products,
  marketers,
  withdrawals,
  onNavigateTab,
}: AdminDashboardProps) {
  const { locale } = useLanguage();

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const totalWholesale = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.wholesaleTotal : 0), 0);
  const totalProfit = orders.reduce((sum, o) => sum + (o.status === 'delivered' ? o.platformProfit : 0), 0);
  const totalCommissions = orders.reduce((sum, o) => sum + (o.status === 'delivered' ? o.affiliateCommission : 0), 0);

  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const deliveryRate = orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0;
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');
  const pendingMarketers = marketers.filter((m) => m.status === 'pending');

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Clean Executive Header (Zero Purple Gradients) */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              لوحة العمليات المركزية
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-ink">
            نظام إدارة المبيعات، الشحن، والعمولات
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            متابعة فورية لدورات الطلبات، تأكيدات الكول سنتر، شركات الشحن، وتسويات محافظ المسوقين
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingMarketers.length > 0 && (
            <button
              onClick={() => onNavigateTab('marketers')}
              className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1.5 num-tabular"
            >
              <Users size={14} strokeWidth={1.6} />
              <span>{pendingMarketers.length} طلب انضمام مسوق جديد</span>
            </button>
          )}
          {pendingWithdrawals.length > 0 && (
            <button
              onClick={() => onNavigateTab('withdrawals')}
              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5 num-tabular"
            >
              <AlertCircle size={14} strokeWidth={1.6} />
              <span>{pendingWithdrawals.length} طلب سحب بانتظار التحويل</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Grid: Clean 4-column metric cards with monochrome icons in #F4F4F5 squares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Platform Revenue */}
        <div className="bg-white p-5 rounded-xl border border-border flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              إجمالي مبيعات المنصة
            </span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <DollarSign size={16} strokeWidth={1.6} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink font-mono num-tabular">
              {totalRevenue.toLocaleString()}{' '}
              <span className="text-xs font-sans text-neutral-400 font-normal">ج.م</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              مجموع قيمة كافة الطلبات المنفذة
            </p>
          </div>
        </div>

        {/* Affiliate Commissions Paid */}
        <div className="bg-white p-5 rounded-xl border border-border flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              عمولات المسوقين المستحقة
            </span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <Wallet size={16} strokeWidth={1.6} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700 font-mono num-tabular">
              {totalCommissions.toLocaleString()}{' '}
              <span className="text-xs font-sans text-neutral-400 font-normal">ج.م</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              أرباح المسوقين من الطلبات المسلّمة
            </p>
          </div>
        </div>

        {/* Net Platform Profit */}
        <div className="bg-white p-5 rounded-xl border border-border flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              صافي أرباح المنصة
            </span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <TrendingUp size={16} strokeWidth={1.6} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink font-mono num-tabular">
              {totalProfit.toLocaleString()}{' '}
              <span className="text-xs font-sans text-neutral-400 font-normal">ج.م</span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              صافي أرباح هوامش الجملة بعد تسليم الشحنات
            </p>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="bg-white p-5 rounded-xl border border-border flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              معدل نجاح التسليم
            </span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <Truck size={16} strokeWidth={1.6} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ink font-mono num-tabular">
              {deliveryRate}%
            </div>
            <p className="text-[11px] text-neutral-400 mt-1 num-tabular">
              {deliveredOrders.length} طلب تم تسليمه من أصل {orders.length}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Quick Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div
          onClick={() => onNavigateTab('orders')}
          className="p-3.5 rounded-lg bg-white border border-border flex items-center justify-between cursor-pointer hover:border-neutral-400 transition-colors"
        >
          <div>
            <span className="text-neutral-500 block text-[11px]">طلبات قيد المراجعة</span>
            <span className="text-lg font-bold text-amber-700 font-mono num-tabular">{pendingOrders.length}</span>
          </div>
          <Clock size={18} strokeWidth={1.6} className="text-neutral-400" />
        </div>

        <div
          onClick={() => onNavigateTab('products')}
          className="p-3.5 rounded-lg bg-white border border-border flex items-center justify-between cursor-pointer hover:border-neutral-400 transition-colors"
        >
          <div>
            <span className="text-neutral-500 block text-[11px]">منتجات الكتالوج</span>
            <span className="text-lg font-bold text-ink font-mono num-tabular">{products.length}</span>
          </div>
          <Package size={18} strokeWidth={1.6} className="text-neutral-400" />
        </div>

        <div
          onClick={() => onNavigateTab('marketers')}
          className="p-3.5 rounded-lg bg-white border border-border flex items-center justify-between cursor-pointer hover:border-neutral-400 transition-colors"
        >
          <div>
            <span className="text-neutral-500 block text-[11px]">المسوقون المسجلون</span>
            <span className="text-lg font-bold text-ink font-mono num-tabular">{marketers.length}</span>
          </div>
          <Users size={18} strokeWidth={1.6} className="text-neutral-400" />
        </div>

        <div
          onClick={() => onNavigateTab('withdrawals')}
          className="p-3.5 rounded-lg bg-white border border-border flex items-center justify-between cursor-pointer hover:border-neutral-400 transition-colors"
        >
          <div>
            <span className="text-neutral-500 block text-[11px]">طلبات سحب معلقة</span>
            <span className="text-lg font-bold text-rose-700 font-mono num-tabular">{pendingWithdrawals.length}</span>
          </div>
          <Wallet size={18} strokeWidth={1.6} className="text-neutral-400" />
        </div>
      </div>

      {/* Recent Orders SaaS Table Preview */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
          <h3 className="text-sm font-bold text-ink">
            أحدث الطلبات المستلمة
          </h3>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
          >
            <span>عرض كل الطلبات ({orders.length})</span>
            <ArrowUpRight size={13} strokeWidth={1.6} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-neutral-50/70 border-b border-border text-neutral-500 uppercase font-semibold">
                <th className="py-2.5 px-3">رقم الطلب</th>
                <th className="py-2.5 px-3">المسوق</th>
                <th className="py-2.5 px-3">العميل والمحافظة</th>
                <th className="py-2.5 px-3">المبلغ (COD)</th>
                <th className="py-2.5 px-3">عمولة المسوق</th>
                <th className="py-2.5 px-3">الحالة</th>
                <th className="py-2.5 px-3">شركة الشحن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.map((ord) => {
                const st = STATUS_MAP[ord.status] || { label: ord.status, dot: 'bg-neutral-400' };
                return (
                  <tr key={ord.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-ink num-tabular">{ord.orderNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-neutral-700">{ord.affiliateName || 'أفلييت مباشر'}</td>
                    <td className="py-2.5 px-3 text-neutral-800">
                      <div className="font-medium">{ord.customerName}</div>
                      <div className="text-[10px] text-neutral-400 num-tabular">{ord.governorate} - {ord.customerPhone}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-ink num-tabular">{ord.totalAmount} ج.م</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700 num-tabular">+{ord.affiliateCommission} ج.م</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-700 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        <span>{st.label}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500 font-medium">
                      {ord.shippingCompany || 'بانتظار الإسناد'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
