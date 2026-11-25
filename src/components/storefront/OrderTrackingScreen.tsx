'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Box,
  Navigation,
  XCircle,
  RotateCcw,
  User,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import SafeProductImage from '@/components/common/SafeProductImage';
import type { OrderStatus } from '@/lib/types';

interface OrderTrackingScreenProps {
  onBack: () => void;
}

interface TrackedOrderItem {
  id?: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  returnedQuantity: number;
  unitPrice: number;
  image: string;
}

interface TrackedOrderResponse {
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhoneMasked: string;
  governorate: string;
  customerCity: string;
  customerAddressMasked: string;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  shippingCompany: string | null;
  trackingNumber: string | null;
  statusNotes: string | null;
  statusHistory: Array<{ status: string; timestamp: string; note?: string }>;
  items: TrackedOrderItem[];
  createdAt: string;
  deliveredAt: string | null;
  returnWindowEndsAt: string | null;
}

const PROGRESS_STEPS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
];

const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bg: string; dot: string; icon: React.ComponentType<any> }
> = {
  pending: { color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500', icon: Clock },
  confirmed: { color: 'text-blue-800', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500', icon: Package },
  processing: { color: 'text-indigo-800', bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500', icon: Box },
  shipped: { color: 'text-purple-800', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500', icon: Truck },
  out_for_delivery: { color: 'text-cyan-800', bg: 'bg-cyan-50 border-cyan-200', dot: 'bg-cyan-500', icon: Navigation },
  delivered: { color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 },
  partially_returned: { color: 'text-orange-800', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500', icon: RotateCcw },
  returned: { color: 'text-rose-800', bg: 'bg-rose-50 border-rose-200', dot: 'bg-rose-500', icon: RotateCcw },
  cancelled: { color: 'text-neutral-700', bg: 'bg-neutral-100 border-neutral-200', dot: 'bg-neutral-400', icon: XCircle },
};

export default function OrderTrackingScreen({ onBack }: OrderTrackingScreenProps) {
  const { t, locale } = useLanguage();
  const { currencySymbol } = useSettings();
  const [orderInput, setOrderInput] = useState('');
  const [order, setOrder] = useState<TrackedOrderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async () => {
    const cleaned = orderInput.trim();
    if (!cleaned) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(cleaned)}`,
        { cache: 'no-store' }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.orderNumber) {
        setError(data?.error || t('common.noResults'));
        return;
      }
      setOrder(data as TrackedOrderResponse);
    } catch (err) {
      console.error('Error tracking order:', err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    const key = `admin.${status}`;
    const translated = t(key);
    return translated && translated !== key ? translated : status;
  };

  const isExceptionStatus =
    order &&
    (order.status === 'cancelled' ||
      order.status === 'returned' ||
      order.status === 'partially_returned');

  const currentStepIndex = order
    ? order.status === 'partially_returned'
      ? PROGRESS_STEPS.length - 1
      : PROGRESS_STEPS.indexOf(order.status)
    : -1;

  return (
    <div className="min-h-screen pb-24 bg-canvas">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="px-5 pt-8 pb-3 flex items-center gap-3 bg-white border-b border-border rounded-b-xl">
          <button
            onClick={onBack}
            aria-label={locale === 'ar' ? 'رجوع' : 'Back'}
            className="w-9 h-9 rounded-lg bg-neutral-50 border border-border flex items-center justify-center hover:bg-neutral-100 transition-colors"
          >
            <ArrowLeft
              size={18}
              strokeWidth={1.6}
              className={`text-neutral-700 ${locale === 'ar' ? 'rotate-180' : ''}`}
            />
          </button>
          <h1 className="text-base font-bold text-ink">{t('orderTracking.trackOrder')}</h1>
        </div>

        {/* Search input */}
        <div className="px-5 mt-5">
          <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-1.5 block">
            {t('orderTracking.orderNumber')}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                strokeWidth={1.6}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                placeholder={
                  locale === 'ar' ? 'أدخل رقم الطلب (مثال: ORD-20261125-XXXXXX)' : t('orderTracking.enterOrderNumber')
                }
                className="w-full pr-10 pl-3.5 py-2.5 rounded-lg bg-white border border-border text-xs focus:outline-none focus:border-ink font-mono num-tabular"
              />
            </div>
            <button
              onClick={handleTrack}
              disabled={loading || !orderInput.trim()}
              className="px-5 py-2.5 bg-ink text-white font-semibold text-xs rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : t('orderTracking.track')}
            </button>
          </div>

          {error && (
            <p className="text-red-600 text-xs mt-2.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg font-medium">
              {error}
            </p>
          )}
        </div>

        {/* Order details */}
        {order && (
          <div className="px-5 mt-5 space-y-4">
            {/* Status summary card */}
            <div className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <h2 className="text-xs font-bold text-ink">{t('orderTracking.orderDetails')}</h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[11px] font-semibold ${
                    STATUS_CONFIG[order.status]?.bg || 'bg-neutral-100 border-neutral-200'
                  } ${STATUS_CONFIG[order.status]?.color || 'text-neutral-700'}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      STATUS_CONFIG[order.status]?.dot || 'bg-neutral-400'
                    }`}
                  />
                  <span>{statusLabel(order.status)}</span>
                </span>
              </div>

              {/* Order info */}
              <div className="space-y-1.5 text-xs text-neutral-600">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">{t('orderTracking.orderNumber')}</span>
                  <span className="font-mono font-bold text-ink num-tabular">
                    {order.orderNumber}
                  </span>
                </div>

                {order.createdAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">{t('orderTracking.orderDate')}</span>
                    <span className="font-mono text-ink num-tabular">
                      {new Date(order.createdAt).toLocaleDateString(
                        locale === 'ar' ? 'ar-EG' : 'en-US'
                      )}
                    </span>
                  </div>
                )}

                {order.shippingCompany && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">
                      {locale === 'ar' ? 'شركة الشحن' : 'Shipping Company'}
                    </span>
                    <span className="font-semibold text-ink">{order.shippingCompany}</span>
                  </div>
                )}

                {order.trackingNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">
                      {locale === 'ar' ? 'رقم البوليصة' : 'Tracking Number'}
                    </span>
                    <span className="font-mono font-bold text-brand num-tabular">
                      {order.trackingNumber}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-border">
                  <span className="text-neutral-500">
                    {locale === 'ar' ? 'قيمة المنتجات' : 'Subtotal'}
                  </span>
                  <span className="font-mono text-ink num-tabular">
                    {order.subtotal.toFixed(2)} {currencySymbol}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">
                    {locale === 'ar' ? 'تكلفة الشحن' : 'Shipping'}
                  </span>
                  <span className="font-mono text-ink num-tabular">
                    {order.shippingFee.toFixed(2)} {currencySymbol}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-border">
                  <span className="text-neutral-700 font-semibold">{t('cart.total')}</span>
                  <span className="font-bold text-sm text-ink font-mono num-tabular">
                    {order.totalAmount.toFixed(2)} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Exception Banner for Cancelled / Returned / Partially Returned */}
            {isExceptionStatus && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                  STATUS_CONFIG[order.status].bg
                } ${STATUS_CONFIG[order.status].color}`}
              >
                {React.createElement(STATUS_CONFIG[order.status].icon, {
                  size: 18,
                  strokeWidth: 1.7,
                  className: 'flex-shrink-0 mt-0.5',
                })}
                <div>
                  <p className="font-bold">{statusLabel(order.status)}</p>
                  {order.statusNotes && <p className="mt-0.5 opacity-90">{order.statusNotes}</p>}
                </div>
              </div>
            )}

            {/* Status timeline (All 6 fulfillment stages) */}
            {order.status !== 'cancelled' && order.status !== 'returned' && (
              <div className="bg-white rounded-xl border border-border p-4">
                <h3 className="text-xs font-bold text-ink mb-4 pb-2 border-b border-border">
                  {t('admin.orderStatus')}
                </h3>
                <div className="space-y-0">
                  {PROGRESS_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const config = STATUS_CONFIG[step];
                    const StepIcon = config.icon;
                    const isLast = index === PROGRESS_STEPS.length - 1;

                    return (
                      <div key={step} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isCurrent
                                ? 'bg-ink text-white'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-neutral-100 text-neutral-400'
                            }`}
                          >
                            <StepIcon size={14} strokeWidth={1.6} />
                          </div>
                          {!isLast && (
                            <div
                              className={`w-px h-6 my-1 ${
                                isCompleted && index < currentStepIndex
                                  ? 'bg-emerald-500'
                                  : 'bg-neutral-200'
                              }`}
                            />
                          )}
                        </div>

                        <div className="pt-1">
                          <p
                            className={`text-xs ${
                              isCurrent
                                ? 'font-bold text-ink'
                                : isCompleted
                                ? 'font-medium text-neutral-800'
                                : 'text-neutral-400'
                            }`}
                          >
                            {statusLabel(step)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order items */}
            {order.items && order.items.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-4">
                <h3 className="text-xs font-bold text-ink mb-3 pb-2 border-b border-border">
                  {t('orderTracking.orderItems')}
                </h3>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-14 rounded-lg bg-zinc-950 border border-border overflow-hidden flex-shrink-0">
                          <SafeProductImage
                            src={item.image}
                            alt={item.productName}
                            className="w-full h-full object-contain"
                            iconSize={14}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate">
                            {item.productName} × {item.quantity}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {t('product.size')}: {item.size}
                            {item.color ? ` · ${item.color}` : ''}
                          </p>
                          {item.returnedQuantity > 0 && (
                            <p className="text-[10px] text-orange-700 font-medium mt-0.5">
                              {locale === 'ar'
                                ? `تم استرجاع ${item.returnedQuantity} من ${item.quantity}`
                                : `Returned ${item.returnedQuantity} of ${item.quantity}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="font-mono font-bold text-ink num-tabular flex-shrink-0">
                        {(item.unitPrice * item.quantity).toFixed(2)} {currencySymbol}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy-masked Customer Delivery Info */}
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-ink mb-2.5 pb-2 border-b border-border">
                {t('checkout.customerInfo')}
              </h3>
              <div className="space-y-1.5 text-xs text-neutral-600">
                <div className="flex items-center gap-2">
                  <User size={13} strokeWidth={1.6} className="text-neutral-400 flex-shrink-0" />
                  <span className="font-medium text-ink">{order.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} strokeWidth={1.6} className="text-neutral-400 flex-shrink-0" />
                  <span className="font-mono num-tabular" dir="ltr">
                    {order.customerPhoneMasked}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} strokeWidth={1.6} className="text-neutral-400 flex-shrink-0" />
                  <span>{order.customerAddressMasked}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
