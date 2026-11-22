'use client';

import React, { useState } from 'react';
import { ArrowLeft, Check, ShoppingBag, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Product {
  id: string;
  name_en: string;
  name_ar: string;
  brand: string;
  price: number;
  salePrice?: number;
  commission?: number;
  description_en: string;
  description_ar: string;
  images: string[];
  category: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  stock: number;
  isActive: boolean;
}

interface ProductDetailsProps {
  product: Product;
  onBack: () => void;
  onAddToCart: (product: Product, size: string) => void;
}

export default function ProductDetails({ product, onBack, onAddToCart }: ProductDetailsProps) {
  const { locale } = useLanguage();
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || 'Standard');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors?.[0]?.name || '');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const name = locale === 'ar' ? product.name_ar : product.name_en;
  const description = locale === 'ar' ? product.description_ar : product.description_en;
  const hasSale = product.salePrice && product.salePrice < product.price;
  const displayPrice = hasSale ? product.salePrice : product.price;

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

        <span className="text-[11px] text-ink-muted">
          {product.category}
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Main Product Image Container */}
          <div className="md:col-span-6 lg:col-span-7 bg-white rounded-xl border border-border p-4 shadow-subtle">
            <div className="relative aspect-[1245/1600] w-full overflow-hidden rounded-lg bg-zinc-950 flex items-center justify-center">
              <img
                src={product.images?.[selectedImageIndex] || product.images?.[0] || ''}
                alt={name}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-14 h-14 rounded-md overflow-hidden border transition-all ${
                      selectedImageIndex === idx ? 'border-ink ring-1 ring-ink' : 'border-border opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Block */}
          <div className="md:col-span-6 lg:col-span-5 bg-white rounded-xl border border-border p-6 space-y-4 shadow-subtle">
            <div>
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                {product.brand}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-ink mt-1 leading-snug">
                {name}
              </h1>

              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-ink num-tabular">
                  {displayPrice}
                </span>
                <span className="text-sm font-medium text-ink-muted">
                  {locale === 'ar' ? 'ج.م' : 'EGP'}
                </span>
                {hasSale && (
                  <span className="text-xs text-ink-subtle line-through num-tabular">
                    {product.price}
                  </span>
                )}
              </div>
            </div>

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-ink">
                    {locale === 'ar' ? 'المقاس المتاح' : 'Available Size'}
                  </span>
                  <span className="text-[11px] text-ink-muted font-medium">
                    {selectedSize}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selectedSize === s
                          ? 'bg-ink text-white border-ink shadow-xs'
                          : 'bg-white text-ink border-border hover:border-zinc-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="pt-3 border-t border-border">
                <span className="text-xs font-semibold text-ink block mb-2">
                  {locale === 'ar' ? 'اللون' : 'Color'}: <span className="font-normal text-ink-muted">{selectedColor}</span>
                </span>
                <div className="flex gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`px-3 py-1 rounded-md text-xs border font-medium transition-all ${
                        selectedColor === c.name
                          ? 'border-ink bg-zinc-100 text-ink'
                          : 'border-border text-ink-muted hover:border-zinc-300'
                      }`}
                    >
                      {c.name}
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
              <p className="text-xs text-ink-muted leading-relaxed">
                {description}
              </p>
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
                <span>{locale === 'ar' ? 'استبدال فوري' : 'Easy Returns'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Add to Cart CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border py-3 px-4 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-ink-muted block">
              {locale === 'ar' ? 'السعر الإجمالي' : 'Total Price'}
            </span>
            <div className="text-lg font-bold text-ink num-tabular">
              {displayPrice} <span className="text-xs font-normal text-ink-muted">{locale === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          <button
            onClick={() => onAddToCart(product, selectedSize)}
            className="flex-1 py-3 px-5 rounded-xl bg-ink hover:bg-zinc-800 text-white font-semibold text-xs transition-all shadow-subtle active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <ShoppingBag size={15} strokeWidth={1.6} />
            <span>{locale === 'ar' ? 'إضافة إلى حقيبة المشتريات' : 'Add to Bag'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
