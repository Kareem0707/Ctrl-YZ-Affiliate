'use client';

import React from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface CartScreenProps {
  onBack: () => void;
  onNext: () => void;
}

export default function CartScreen({ onBack, onNext }: CartScreenProps) {
  const { cart, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();
  const { t, locale } = useLanguage();

  const getName = (item: any) => (locale === 'ar' ? item.name_ar : item.name_en);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas">
        {/* Header */}
        <div className="px-5 pt-12 pb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={1.6} className="text-neutral-700" />
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
      {/* Header */}
      <div className="px-5 pt-12 pb-2">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-neutral-50 transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={1.6} className="text-neutral-700" />
        </button>
      </div>

      {/* Title row */}
      <div className="px-5 flex items-baseline justify-between mb-5">
        <h1 className="text-xl font-bold text-ink">{t('navigation.myBag')}</h1>
        <p className="text-neutral-400 text-xs num-tabular">
          {t('cart.total')} {cartCount} {t('cart.items')}
        </p>
      </div>

      {/* Cart items */}
      <div className="px-5 space-y-3">
        {cart.map((item: any) => (
          <div
            key={item.cartId || `${item.id}-${item.selectedSize}`}
            className="flex items-center gap-3.5 bg-white rounded-xl p-3 border border-border hover:border-neutral-300 transition-colors"
          >
            {/* Thumbnail */}
            <div className="w-16 h-20 rounded-lg bg-zinc-950 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.images?.[0] ? (
                <img
                  src={item.images[0]}
                  alt={getName(item)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ShoppingBag size={24} strokeWidth={1.4} className="text-neutral-300" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wide">
                {item.brand} · {t('product.size')} {item.selectedSize}
              </p>
              <p className="text-xs font-bold text-ink truncate mt-0.5">
                {getName(item)}
              </p>
              <p className="text-xs font-bold text-ink font-mono mt-1 num-tabular">
                {item.salePrice && item.salePrice < item.price ? item.salePrice : item.price}{' '}
                <span className="font-sans font-normal text-neutral-500">{t('common.egp')}</span>
              </p>

              {/* Quantity controls */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    const cartId = item.cartId || `${item.id}-${item.selectedSize}`;
                    if (item.quantity <= 1) {
                      removeFromCart(cartId);
                    } else {
                      updateQuantity(cartId, item.quantity - 1);
                    }
                  }}
                  className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors text-neutral-600"
                >
                  <Minus size={12} strokeWidth={1.6} />
                </button>
                <span className="text-xs font-bold text-ink w-4 text-center font-mono num-tabular">
                  {item.quantity}
                </span>
                <button
                  onClick={() => {
                    const cartId = item.cartId || `${item.id}-${item.selectedSize}`;
                    updateQuantity(cartId, item.quantity + 1);
                  }}
                  className="w-6 h-6 rounded bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors text-neutral-600"
                >
                  <Plus size={12} strokeWidth={1.6} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom total + next */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-6 pt-4 bg-white/95 backdrop-blur-xs border-t border-border z-20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-neutral-500 text-xs font-medium">{t('cart.total')}</span>
          <span className="text-lg font-bold font-mono text-ink num-tabular">
            {cartTotal.toFixed(2)} <span className="text-xs font-sans font-normal">{t('common.egp')}</span>
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
