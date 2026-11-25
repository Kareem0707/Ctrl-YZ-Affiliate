'use client';

import React from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import SafeProductImage from '@/components/common/SafeProductImage';

interface CartScreenProps {
  onBack: () => void;
  onNext: () => void;
}

export default function CartScreen({ onBack, onNext }: CartScreenProps) {
  const { cart, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();
  const { t, locale } = useLanguage();
  const { currencySymbol } = useSettings();

  const getName = (item: CartItem) =>
    locale === 'ar' ? item.name_ar || item.name : item.name_en || item.name;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        {/* Header */}
        <div className="px-5 pt-8 pb-4">
          <button
            onClick={onBack}
            aria-label={locale === 'ar' ? 'رجوع' : 'Back'}
            className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft
              size={18}
              strokeWidth={1.6}
              className={`text-neutral-700 ${locale === 'ar' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-5">
          <div className="w-16 h-16 rounded-xl bg-neutral-100 border border-border flex items-center justify-center mb-4 text-neutral-400">
            <ShoppingBag size={28} strokeWidth={1.4} />
          </div>
          <p className="text-base font-bold text-ink mb-1">{t('cart.emptyBag')}</p>
          <p className="text-neutral-400 text-xs text-center mb-6">
            {locale === 'ar' ? 'سلة التسوق فارغة حالياً' : 'Your bag is currently empty'}
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
          >
            {t('navigation.discover')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 bg-canvas">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="px-5 pt-8 pb-2">
          <button
            onClick={onBack}
            aria-label={locale === 'ar' ? 'رجوع' : 'Back'}
            className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft
              size={18}
              strokeWidth={1.6}
              className={`text-neutral-700 ${locale === 'ar' ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Title row */}
        <div className="px-5 flex items-baseline justify-between mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-ink">{t('navigation.myBag')}</h1>
          <p className="text-neutral-400 text-xs num-tabular">
            {t('cart.total')} {cartCount} {t('cart.items')}
          </p>
        </div>

        {/* Cart items */}
        <div className="px-5 space-y-3">
          {cart.map((item) => {
            const atMaxStock = item.quantity >= item.maxStock;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3.5 bg-white rounded-xl p-3 border border-border hover:border-neutral-300 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-20 rounded-lg bg-zinc-950 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <SafeProductImage
                    src={item.image}
                    alt={getName(item)}
                    sizes="64px"
                    className="object-contain"
                    iconSize={20}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wide flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-neutral-700">{item.brand}</span>
                        <span>·</span>
                        <span>
                          {t('product.size')}: <strong className="text-ink">{item.size}</strong>
                        </span>
                        {item.color && (
                          <>
                            <span>·</span>
                            <span>
                              {locale === 'ar' ? 'اللون:' : 'Color:'}{' '}
                              <strong className="text-ink">{item.color}</strong>
                            </span>
                          </>
                        )}
                      </p>
                      <p className="text-xs font-bold text-ink truncate mt-0.5">{getName(item)}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={locale === 'ar' ? 'حذف العنصر' : 'Remove item'}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} strokeWidth={1.6} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs font-bold text-ink font-mono num-tabular">
                      {(item.price * item.quantity).toFixed(2)}{' '}
                      <span className="font-sans font-normal text-neutral-500">{currencySymbol}</span>
                    </p>

                    {/* Quantity controls clamped to [1, item.maxStock] */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity <= 1) {
                            removeFromCart(item.id);
                          } else {
                            updateQuantity(item.id, item.quantity - 1);
                          }
                        }}
                        aria-label={locale === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'}
                        className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors text-neutral-700"
                      >
                        <Minus size={12} strokeWidth={1.8} />
                      </button>
                      <span className="text-xs font-bold text-ink w-5 text-center font-mono num-tabular">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={atMaxStock}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={locale === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                        className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-neutral-700"
                      >
                        <Plus size={12} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                  {atMaxStock && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      {locale === 'ar'
                        ? `الحد الأقصى المتوفر في المخزن: ${item.maxStock}`
                        : `Max available in stock: ${item.maxStock}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom total + next (z-40, BottomNav hidden on cart) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl px-5 pb-6 pt-4 bg-white/95 backdrop-blur-md border-t border-border z-40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-neutral-500 text-xs font-medium">{t('cart.total')}</span>
          <span className="text-lg font-bold font-mono text-ink num-tabular">
            {cartTotal.toFixed(2)}{' '}
            <span className="text-xs font-sans font-normal">{currencySymbol}</span>
          </span>
        </div>
        <button
          onClick={onNext}
          className="w-full py-3 bg-ink hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg active:scale-[0.98] transition-all"
        >
          {t('cart.next')}
        </button>
      </div>
    </div>
  );
}
