'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowRight, ShoppingBag, SlidersHorizontal, Check } from 'lucide-react';
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
  isFeatured?: boolean;
}

interface DiscoverScreenProps {
  onProductClick: (product: Product) => void;
  products: Product[];
  loading: boolean;
}

export default function DiscoverScreen({ onProductClick, products, loading }: DiscoverScreenProps) {
  const { locale } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(() => {
    const list = ['All'];
    products.forEach((p) => {
      if (p.category && !list.includes(p.category)) {
        list.push(p.category);
      }
    });
    return list;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => p.isActive);
    if (activeCategory !== 'All') {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name_en.toLowerCase().includes(q) ||
          p.name_ar.includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [products, activeCategory, searchQuery]);

  const getName = (p: Product) => (locale === 'ar' ? p.name_ar : p.name_en);

  const translateCategory = (cat: string) => {
    if (locale !== 'ar') return cat;
    switch (cat.toLowerCase()) {
      case 'all': return 'جميع المنتجات';
      case 'hoodies': return 'هوديز وسويت شيرت';
      case 'footwear': return 'أحذية وسنيكرز';
      case 'pants': return 'بنطلونات وكارجو';
      case 'watches': return 'ساعات وإلكترونيات';
      case 'jackets': return 'جاكيتات شتوية';
      case 'accessories': return 'إكسسوارات وشنط';
      default: return cat;
    }
  };

  return (
    <div className="pb-28 min-h-screen">
      {/* Brand Campaign Hero Card (Black, White & Electric Blue Identity) */}
      <div className="px-5 pt-5 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-[#030303] text-white border border-zinc-800 shadow-elevated p-6 sm:p-8">
          {/* Subtle Ambient Electric Blue Glow */}
          <div className="absolute top-0 left-0 w-80 h-80 bg-brand/20 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#0084FF]/10 rounded-full blur-2xl pointer-events-none translate-x-1/3 translate-y-1/3" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              {/* Campaign Tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-white mb-3">
                <span className="w-2 h-2 rounded-full bg-brand shadow-[0_0_8px_#0258ED] animate-pulse" />
                <span>{locale === 'ar' ? 'كامبين الشتاء الرسمي 2026' : 'Winter 2026 Campaign'}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-[#38BDF8] font-bold">{locale === 'ar' ? 'الإصدار المحدود' : 'Limited Drop'}</span>
              </div>

              {/* Logo Preview */}
              <div className="mb-3">
                <img
                  src="/ctrl-logo-transparent.png"
                  alt="Ctrl YZ"
                  className="h-8 sm:h-10 w-auto object-contain"
                />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 leading-snug">
                {locale === 'ar'
                  ? 'كولكشن الهوديز الأوفر سايز — ميلتون قطن أصلي 420 GSM'
                  : 'Oversized Streetwear Hoodies — Heavyweight 420 GSM'}
              </h2>

              <p className="text-xs text-zinc-300 leading-relaxed max-w-lg mb-4">
                {locale === 'ar'
                  ? 'تصاميم جرافيك حصرية وثابتة ضد الغسيل، قطن مصري فاخر مبطن بوبرة دافئة. معاينة كاملة للقطعة والتأكد من المقاس قبل الدفع مع شحن سريع لجميع المحافظات.'
                  : 'Exclusive streetwear graphic designs, fade-resistant digital prints, 100% heavyweight cotton fleece with inspection before delivery.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-300">
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span>{locale === 'ar' ? 'قطن مصري 100% ثقيل' : '100% Heavy Cotton'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span>{locale === 'ar' ? 'معاينة واستلام كاش' : 'Cash on Delivery'}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  <span>{locale === 'ar' ? 'شحن لجميع المحافظات' : 'All Governorates'}</span>
                </div>
              </div>
            </div>

            {/* Quick Affiliate Campaign Banner Link */}
            <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl p-5 md:w-64 text-center flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold mb-1">
                  {locale === 'ar' ? 'برنامج المسوقين المعتمد' : 'Affiliate Program'}
                </span>
                <span className="text-lg font-bold text-white block num-tabular">
                  {locale === 'ar' ? 'أرباح حتى 260 ج.م' : 'Up to 260 EGP'}
                </span>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {locale === 'ar' ? 'عمولة فورية على كل قطعة هودي تُباع' : 'Direct profit per hoodie sold'}
                </p>
              </div>

              <a
                href="/affiliate"
                className="mt-4 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-subtle"
              >
                <span>{locale === 'ar' ? 'انضم لكامبين المسوقين' : 'Earn as Affiliate'}</span>
                <ArrowRight size={13} className={locale === 'ar' ? 'rotate-180' : ''} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Editorial Store Header */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
            {locale === 'ar' ? 'المتجر الرسمي المباشر' : 'Official Collection'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            {locale === 'ar' ? 'تشكيلة الشتاء العصرية' : 'Modern Winter Essentials'}
          </h1>
          <p className="text-xs text-ink-muted max-w-lg mt-0.5">
            {locale === 'ar'
              ? 'خامات قطنية وحرارية فاخرة، تقفيل خياطة متقن، مع ميزة المعاينة قبل الاستلام والدفع كاش عند الباب.'
              : 'Premium heavyweight cottons, precision tailoring, with cash on delivery and inspection upon arrival.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-5 relative">
          <Search size={16} strokeWidth={1.6} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder={locale === 'ar' ? 'ابحث باسم المنتج أو البراند أو الكود...' : 'Search collection, brand or SKU...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white border border-border text-xs placeholder:text-ink-subtle focus:outline-none focus:border-brand transition-colors shadow-subtle"
          />
        </div>

        {/* Category Pills */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-[#030303] text-white border-brand shadow-xs'
                    : 'bg-white text-ink-muted border-border hover:border-brand/40 hover:text-ink'
                }`}
              >
                {translateCategory(cat)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3 text-xs text-ink-muted">
          <span>{locale === 'ar' ? `المنتجات المتاحة (${filteredProducts.length})` : `Available items (${filteredProducts.length})`}</span>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            {locale === 'ar' ? 'معاينة قبل الدفع' : 'Inspect before paying'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-zinc-100 animate-pulse border border-border" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center my-4">
            <ShoppingBag size={32} strokeWidth={1.6} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-xs font-semibold text-ink">
              {locale === 'ar' ? 'لا توجد منتجات تطابق هذا البحث' : 'No matching products found'}
            </p>
            <p className="text-[11px] text-ink-muted mt-1">
              {locale === 'ar' ? 'جرّب تغيير التصنيف أو كلمة البحث' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const hasDiscount = product.salePrice && product.salePrice < product.price;
              const effectivePrice = hasDiscount ? product.salePrice : product.price;

              return (
                <div
                  key={product.id}
                  onClick={() => onProductClick(product)}
                  className="bg-white rounded-xl border border-border overflow-hidden hover:border-zinc-400 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-subtle"
                >
                  {/* Image container (Complete Full View from top to bottom) */}
                  <div className="relative aspect-[1245/1600] w-full bg-zinc-950 overflow-hidden border-b border-border flex items-center justify-center">
                    <img
                      src={product.images[0] || '/products/06f6580b-e809-4fb1-a16b-b668d10ab5a8.jfif'}
                      alt={getName(product)}
                      className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      {product.stock <= 20 && (
                        <span className="text-[10px] bg-white/95 text-ink font-medium px-2 py-0.5 rounded shadow-xs border border-border">
                          {locale === 'ar' ? `متبقي ${product.stock}` : `${product.stock} left`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1">
                        <span className="font-semibold uppercase tracking-wider">{product.brand}</span>
                        <span>{product.sizes?.slice(0, 3).join(', ')}</span>
                      </div>

                      <h3 className="font-semibold text-sm text-ink leading-snug line-clamp-2 group-hover:text-brand transition-colors">
                        {getName(product)}
                      </h3>
                    </div>

                    <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-bold text-ink num-tabular">
                          {effectivePrice}
                        </span>
                        <span className="text-xs text-ink-muted font-normal">
                          {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-ink-subtle line-through num-tabular">
                            {product.price}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onProductClick(product);
                        }}
                        className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-ink hover:text-white text-ink text-[11px] font-medium transition-colors flex items-center gap-1"
                      >
                        <span>{locale === 'ar' ? 'تفاصيل' : 'View'}</span>
                        <ArrowRight size={11} strokeWidth={1.6} className={locale === 'ar' ? 'rotate-180' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
