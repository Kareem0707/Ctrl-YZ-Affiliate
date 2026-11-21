'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Calculator,
  Megaphone,
  PackagePlus,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import type { Product } from '@/lib/types';
import ProfitCalculatorModal from './ProfitCalculatorModal';
import AdCopiesModal from './AdCopiesModal';
import { useLanguage } from '@/contexts/LanguageContext';

interface AffiliateProductsProps {
  products: Product[];
  onSelectForOrder: (product: Product) => void;
}

export default function AffiliateProducts({
  products,
  onSelectForOrder,
}: AffiliateProductsProps) {
  const { locale } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'commission_desc' | 'price_asc' | 'price_desc' | 'stock'>('commission_desc');

  const [calcProduct, setCalcProduct] = useState<Product | null>(null);
  const [adCopiesProduct, setAdCopiesProduct] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter((p) => p.isActive);

    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name_ar.includes(q) ||
          p.name_en.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'commission_desc') {
      result.sort((a, b) => b.commission - a.commission);
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => a.wholesalePrice - b.wholesalePrice);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.wholesalePrice - a.wholesalePrice);
    } else if (sortBy === 'stock') {
      result.sort((a, b) => b.stock - a.stock);
    }

    return result;
  }, [products, selectedCategory, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-border flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} strokeWidth={1.6} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'ابحث باسم المنتج، الماركة، أو الكود...' : 'Search product or brand...'}
            className="w-full pr-10 pl-3.5 py-2 rounded-lg bg-neutral-50 border border-border text-xs focus:outline-none focus:border-ink transition-colors"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-ink text-white font-semibold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-ink'
              }`}
            >
              {cat === 'All' ? (locale === 'ar' ? 'جميع المنتجات' : 'All') : cat}
            </button>
          ))}
        </div>

        {/* Sort By */}
        <div className="w-full md:w-auto flex items-center justify-end gap-2 text-xs">
          <SlidersHorizontal size={14} strokeWidth={1.6} className="text-neutral-400" />
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-border text-xs font-medium text-neutral-700 focus:outline-none focus:border-ink"
          >
            <option value="commission_desc">الأعلى عمولة للمسوق</option>
            <option value="price_asc">الأقل سعراً بالجملة</option>
            <option value="price_desc">الأعلى سعراً بالجملة</option>
            <option value="stock">الأكثر توفراً بالمخزن</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-xl border border-border overflow-hidden flex flex-col group hover:border-neutral-400 transition-colors duration-200"
          >
            {/* Clean Full-View Image Area (Complete from top to bottom) */}
            <div className="relative aspect-[1245/1600] w-full bg-zinc-950 overflow-hidden border-b border-border flex items-center justify-center">
              <img
                src={prod.images[0] || '/products/06f6580b-e809-4fb1-a16b-b668d10ab5a8.jfif'}
                alt={prod.name_ar}
                className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
              />
              {/* Subtle stock indicator */}
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs border border-border px-2 py-0.5 rounded-md text-[11px] font-medium text-neutral-600 shadow-xs">
                متاح {prod.stock} قطعة
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                  <span className="font-semibold text-neutral-500 uppercase tracking-wider">{prod.brand}</span>
                  <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-medium">{prod.category}</span>
                </div>

                <h3 className="font-bold text-ink text-sm leading-snug mb-2 group-hover:text-brand transition-colors">
                  {locale === 'ar' ? prod.name_ar : prod.name_en}
                </h3>

                <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-4">
                  {locale === 'ar' ? prod.description_ar : prod.description_en}
                </p>

                {/* Price Matrix */}
                <div className="bg-neutral-50 rounded-lg p-2.5 border border-border grid grid-cols-3 gap-2 text-center mb-4">
                  <div>
                    <span className="text-[10px] text-neutral-500 block font-medium">سعر الجملة</span>
                    <span className="text-xs font-bold text-ink num-tabular">{prod.wholesalePrice} ج.م</span>
                  </div>
                  <div className="border-x border-border">
                    <span className="text-[10px] text-neutral-500 block font-medium">البيع المقترح</span>
                    <span className="text-xs font-bold text-ink num-tabular">{prod.suggestedPrice} ج.م</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 block font-medium">صافي ربحك</span>
                    <span className="text-xs font-bold text-emerald-700 num-tabular">+{prod.commission} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCalcProduct(prod)}
                    className="py-2 px-2.5 rounded-lg bg-white border border-border hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Calculator size={13} strokeWidth={1.6} className="text-neutral-500" />
                    <span>حاسبة الأرباح</span>
                  </button>

                  <button
                    onClick={() => setAdCopiesProduct(prod)}
                    className="py-2 px-2.5 rounded-lg bg-white border border-border hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Megaphone size={13} strokeWidth={1.6} className="text-neutral-500" />
                    <span>نصوص الإعلانات</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dedicated Emerald Commission Strip + Crisp Action */}
            <div className="bg-emerald-50/70 border-t border-emerald-200/80 p-3 px-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 font-medium block">ربحك المضمون</span>
                <span className="text-sm font-bold font-mono text-emerald-700 num-tabular">
                  عمولتك: +{prod.commission} ج.م
                </span>
              </div>

              <button
                onClick={() => onSelectForOrder(prod)}
                className="py-2 px-3.5 rounded-lg bg-ink hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <PackagePlus size={14} strokeWidth={1.6} />
                <span>تسجيل طلب</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {calcProduct && (
        <ProfitCalculatorModal
          product={calcProduct}
          onClose={() => setCalcProduct(null)}
          onUsePrice={(price) => {
            onSelectForOrder({ ...calcProduct, suggestedPrice: price });
          }}
        />
      )}

      {adCopiesProduct && (
        <AdCopiesModal
          product={adCopiesProduct}
          onClose={() => setAdCopiesProduct(null)}
        />
      )}
    </div>
  );
}
