'use client';

import React, { useState } from 'react';
import { ArrowLeft, Search, Package, Truck, CheckCircle2, Clock, MapPin, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOrderByNumber } from '@/lib/firestore';

interface OrderTrackingScreenProps {
  onBack: () => void;
}

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string; icon: any }> = {
  pending: { color: 'text-amber-800', bg: 'bg-amber-50', dot: 'bg-amber-500', icon: Clock },
  confirmed: { color: 'text-blue-800', bg: 'bg-blue-50', dot: 'bg-blue-500', icon: Package },
  shipped: { color: 'text-purple-800', bg: 'bg-purple-50', dot: 'bg-purple-500', icon: Truck },
  delivered: { color: 'text-emerald-800', bg: 'bg-emerald-50', dot: 'bg-emerald-500', icon: CheckCircle2 },
  cancelled: { color: 'text-neutral-600', bg: 'bg-neutral-100', dot: 'bg-neutral-400', icon: Clock },
};

export default function OrderTrackingScreen({ onBack }: OrderTrackingScreenProps) {
  const { t, locale } = useLanguage();
  const [orderInput, setOrderInput] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async () => {
    if (!orderInput.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const result = await getOrderByNumber(orderInput.trim());
      if (result) {
        setOrder(result);
      } else {
        setError(t('common.noResults'));
      }
    } catch (err) {
      console.error('Error tracking order:', err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const getName = (item: any) => (locale === 'ar' ? item.name_ar : item.name_en);

  const currentStepIndex = order
    ? STATUS_STEPS.indexOf(order.status || 'pending')
    : -1;

  const statusLabel = (status: string) => {
    const key = `admin.${status}` as string;
    return t(key) || status;
  };

  return (
    <div className="min-h-screen pb-10 bg-canvas">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center gap-3 bg-white border-b border-border">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg bg-neutral-50 border border-border flex items-center justify-center hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={1.6} className="text-neutral-700" />
        </button>
        <h1 className="text-base font-bold text-ink">
          {t('orderTracking.trackOrder')}
        </h1>
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
              placeholder={t('orderTracking.enterOrderNumber')}
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
          <p className="text-red-600 text-xs mt-2.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg font-medium">{error}</p>
        )}
      </div>

      {/* Order details */}
      {order && (
        <div className="px-5 mt-5 space-y-4">
          {/* Status summary card */}
          <div className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <h2 className="text-xs font-bold text-ink">
                {t('orderTracking.orderDetails')}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium ${
                  STATUS_CONFIG[order.status]?.bg || 'bg-neutral-100'
                } ${STATUS_CONFIG[order.status]?.color || 'text-neutral-700'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[order.status]?.dot || 'bg-neutral-400'}`} />
                <span>{statusLabel(order.status)}</span>
              </span>
            </div>

            {/* Order info */}
            <div className="space-y-1.5 text-xs text-neutral-600">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">{t('orderTracking.orderNumber')}</span>
                <span className="font-mono font-bold text-ink num-tabular">
                  {order.orderNumber || order.id}
                </span>
              </div>
              {order.createdAt && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">{t('orderTracking.orderDate')}</span>
                  <span className="font-mono text-ink num-tabular">
                    {new Date(order.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-neutral-500">{t('cart.total')}</span>
                <span className="font-bold text-sm text-ink font-mono num-tabular">
                  {order.total?.toFixed(2)} {t('common.egp')}
                </span>
              </div>
            </div>
          </div>

          {/* Status timeline */}
          <div className="bg-white rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-ink mb-4 pb-2 border-b border-border">{t('admin.orderStatus')}</h3>
            <div className="space-y-0">
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const config = STATUS_CONFIG[step] || STATUS_CONFIG.pending;
                const StepIcon = config.icon;
                const isLast = index === STATUS_STEPS.length - 1;

                return (
                  <div key={step} className="flex items-start gap-3">
                    {/* Timeline dot + line */}
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

                    {/* Step label */}
                    <div className="pt-1">
                      <p
                        className={`text-xs ${
                          isCurrent ? 'font-bold text-ink' : isCompleted ? 'font-medium text-neutral-800' : 'text-neutral-400'
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

          {/* Order items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-ink mb-2.5 pb-2 border-b border-border">
                {t('orderTracking.orderItems')}
              </h3>
              <div className="space-y-2">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink truncate">
                        {getName(item)} × {item.quantity}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {t('product.size')}: {item.size}
                      </p>
                    </div>
                    <p className="font-mono font-bold text-ink num-tabular mr-3">
                      {(item.price * item.quantity).toFixed(2)} {t('common.egp')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer info */}
          {order.customer && (
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-ink mb-2.5 pb-2 border-b border-border">
                {t('checkout.customerInfo')}
              </h3>
              <div className="space-y-1.5 text-xs text-neutral-600">
                <div className="flex items-center gap-2">
                  <Phone size={13} strokeWidth={1.6} className="text-neutral-400 flex-shrink-0" />
                  <span className="font-mono num-tabular">{order.customer.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} strokeWidth={1.6} className="text-neutral-400 flex-shrink-0" />
                  <span>
                    {order.customer.address}, {order.customer.city}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
