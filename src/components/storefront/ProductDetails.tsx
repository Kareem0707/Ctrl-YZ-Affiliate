'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  ShieldCheck,
  Truck,
  RotateCcw,
  AlertCircle,
  Heart,
} from 'lucide-react';
import type { Product } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import SafeProductImage from '@/components/common/SafeProductImage';

interface ProductDetailsProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, size: string, color: string, variantId?: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

export default function ProductDetails({
  product,
  onBack,
  onAddToCart,
  isFavorite = false,
  onToggleFavorite,
}: ProductDetailsProps) {
  const { locale } = useLanguage();
  const { settings, currencySymbol } = useSettings();

  const initialVariant = useMemo(() => {
    const activeInStock = product.variants?.find((v) => v.isActive && v.stock > 0);
    return activeInStock ?? product.variants?.[0];
  }, [product.variants]);

  const [selectedSize, setSelectedSize] = useState<string>(
    initialVariant?.size || product.sizes?.[0] || 'M'
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    initialVariant?.color || product.colors?.[0]?.name || ''
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const name = locale === 'ar' ? product.name_ar : product.name_en;
  const description = locale === 'ar' ? product.description_ar : product.description_en;
  const hasSale = Boolean(product.salePrice && product.salePrice < product.price);
  const displayPrice = hasSale ? product.salePrice! : product.price;
  const returnWindowDays = settings.returnWindowDays ?? 7;

  // Match exact variant for (selectedSize, selectedColor)
  const matchedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;
    const exact = product.variants.find(
      (v) =>
        v.isActive &&
        v.size.toLowerCase() === selectedSize.toLowerCase() &&
        (!selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase())
    );
    if (exact) return exact;
    return (
      product.variants.find(
        (v) => v.isActive && v.size.toLowerCase() === selectedSize.toLowerCase()
      ) ?? null
    );
  }, [product.variants, selectedSize, selectedColor]);

  const activeStock = matchedVariant ? matchedVariant.stock : product.stock;
  const isOutOfStock = !product.isActive || activeStock <= 0;

  const getSizeStock = (size: string): number => {
    if (!product.variants || product.variants.length === 0) return product.stock;
    const matching = product.variants.filter(
      (v) =>
        v.isActive &&
        v.size.toLowerCase() === size.toLowerCase() &&
        (!selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase())
    );
    if (matching.length > 0) {
      return matching.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
    }
    return product.variants
      .filter((v) => v.isActive && v.size.toLowerCase() === size.toLowerCase())
      .reduce((sum, v) => sum + Math.max(0, v.stock), 0);
  };

  return (
    <div className="min-h-screen bg-canvas pb-32">
      {/* Top Bar */}
      <div className="bg-white border-b border-border px-4 py-3 flex items-center justify-between sticky top-14 z-30">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors p-1"
        >
          <ArrowLeft size={16} strokeWidth={1.6} className={locale === 'ar' ? 'rotate-180' : ''} />
          <span>{locale === 'ar' ? 'العودة للمتجر' : 'Back'}</span>
        </button>

        <span className="text-xs font-semibold text-ink uppercase tracking-wider">
          {product.brand}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-muted hidden sm:inline">{product.category}</span>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(product.id)}
              aria-label={locale === 'ar' ? 'حفظ في المفضلة' : 'Toggle favorite'}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                isFavorite
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-border text-neutral-500 hover:text-rose-600'
              }`}
            >
              <Heart size={15} className={isFavorite ? 'fill-rose-500 text-rose-500' : ''} />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Main Product Image Container */}
          <div className="md:col-span-6 lg:col-span-7 bg-white rounded-xl border border-border p-4 shadow-subtle">
            <div className="relative aspect-[1245/1600] w-full overflow-hidden rounded-lg bg-zinc-950 flex items-center justify-center">
              <SafeProductImage
                src={product.images?.[selectedImageIndex] || product.images?.[0]}
                alt={name}
                sizes="(max-width: 768px) 100vw, 55vw"
                priority
                className="object-contain"
              />
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-md">
                    {locale === 'ar' ? 'نفد المخزون' : 'Out of Stock'}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-14 h-14 rounded-md overflow-hidden border transition-all ${
                      selectedImageIndex === idx
                        ? 'border-ink ring-1 ring-ink'
                        : 'border-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <SafeProductImage
                      src={img}
                      alt={`${name} ${idx + 1}`}
                      sizes="56px"
                      className="object-cover"
                      iconSize={16}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Block */}
          <div className="md:col-span-6 lg:col-span-5 bg-white rounded-xl border border-border p-6 space-y-4 shadow-subtle">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  {product.brand}
                </span>
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                    <AlertCircle size={11} />
                    <span>{locale === 'ar' ? 'نفد المخزون' : 'Out of Stock'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full num-tabular">
                    {locale === 'ar'
                      ? `متوفر: ${activeStock} قطعة`
                      : `${activeStock} in stock`}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-ink mt-1 leading-snug">{name}</h1>

              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-ink num-tabular">
                  {displayPrice}
                </span>
                <span className="text-sm font-medium text-ink-muted">{currencySymbol}</span>
                {hasSale && (
                  <span className="text-xs text-ink-subtle line-through num-tabular">
                    {product.price}
                  </span>
                )}
              </div>
            </div>

            {/* Size Selector with Per-Variant Availability */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink">
                    {locale === 'ar' ? 'المقاس المتاح' : 'Available Size'}
                  </span>
                  <span className="text-[11px] text-ink-muted font-medium">{selectedSize}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => {
                    const sizeStock = getSizeStock(s);
                    const soldOut = sizeStock <= 0;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          selectedSize === s
                            ? 'bg-ink text-white border-ink shadow-xs'
                            : soldOut
                            ? 'bg-neutral-50 text-neutral-400 border-border line-through'
                            : 'bg-white text-ink border-border hover:border-zinc-400'
                        }`}
                      >
                        <span>{s}</span>
                        {!soldOut && sizeStock <= 5 && (
                          <span
                            className={`text-[9px] font-mono ${
                              selectedSize === s ? 'text-amber-300' : 'text-amber-600'
                            }`}
                          >
                            ({sizeStock})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="pt-3 border-t border-border">
                <span className="text-xs font-semibold text-ink block mb-2">
                  {locale === 'ar' ? 'اللون' : 'Color'}:{' '}
                  <span className="font-normal text-ink-muted">{selectedColor}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`px-3 py-1.5 rounded-md text-xs border font-medium transition-all flex items-center gap-2 ${
                        selectedColor === c.name
                          ? 'border-ink bg-zinc-100 text-ink ring-1 ring-ink/10'
                          : 'border-border text-ink-muted hover:border-zinc-300'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/15 flex-shrink-0"
                        style={{ backgroundColor: c.hex || '#111827' }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="pt-3 border-t border-border">
              <span className="text-xs font-semibold text-ink block mb-1.5">
                {locale === 'ar' ? 'تفاصيل ومواصفات المنتج' : 'Specifications & Details'}
              </span>
              <p className="text-xs text-ink-muted leading-relaxed">{description}</p>
            </div>

            {/* Value Badges */}
            <div className="pt-3 border-t border-border grid grid-cols-3 gap-2 text-center text-[11px] text-ink-muted">
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-border/60">
                <ShieldCheck size={15} strokeWidth={1.6} className="mx-auto text-ink mb-1" />
                <span>{locale === 'ar' ? 'معاينة قبل الدفع' : 'Inspect on delivery'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-border/60">
                <Truck size={15} strokeWidth={1.6} className="mx-auto text-ink mb-1" />
                <span>{locale === 'ar' ? 'شحن سريع' : 'Fast Shipping'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-border/60">
                <RotateCcw size={15} strokeWidth={1.6} className="mx-auto text-ink mb-1" />
                <span>
                  {locale === 'ar'
                    ? `استبدال خلال ${returnWindowDays} أيام`
                    : `${returnWindowDays}-Day Returns`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Add to Cart CTA (BottomNav is hidden on product details) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border py-3 px-4 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-ink-muted block">
              {locale === 'ar' ? 'السعر الإجمالي' : 'Total Price'}
            </span>
            <div className="text-lg font-bold text-ink num-tabular">
              {displayPrice}{' '}
              <span className="text-xs font-normal text-ink-muted">{currencySymbol}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() =>
              onAddToCart(product, selectedSize, selectedColor, matchedVariant?.id)
            }
            className="flex-1 py-3 px-5 rounded-xl bg-ink hover:bg-zinc-800 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all shadow-subtle active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <ShoppingBag size={15} strokeWidth={1.6} />
            <span>
              {isOutOfStock
                ? locale === 'ar'
                  ? 'نفد المخزون لهذا المقاس / اللون'
                  : 'Out of Stock'
                : locale === 'ar'
                ? 'إضافة إلى حقيبة المشتريات'
                : 'Add to Bag'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
