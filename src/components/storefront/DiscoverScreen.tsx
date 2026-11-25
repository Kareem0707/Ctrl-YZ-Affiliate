'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, ArrowRight, ShoppingBag, Heart, Sparkles } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import SafeProductImage from '@/components/common/SafeProductImage';
import AffiliateValuePropSection from '@/components/marketing/AffiliateValuePropSection';

interface DiscoverScreenProps {
  onProductClick: (product: Product) => void;
  products: Product[];
  loading: boolean;
  isReferred?: boolean;
  favoriteIds?: string[];
  onToggleFavorite?: (productId: string) => void;
}

export default function DiscoverScreen({
  onProductClick,
  products,
  loading,
  isReferred = false,
  favoriteIds = [],
  onToggleFavorite,
}: DiscoverScreenProps) {
  const { locale } = useLanguage();
  const { currencySymbol } = useSettings();
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
      case 'all':
        return 'جميع المنتجات';
      case 'hoodies':
        return 'هوديز وسويت شيرت';
      case 'footwear':
        return 'أحذية وسنيكرز';
      case 'pants':
        return 'بنطلونات وكارجو';
      case 'watches':
        return 'ساعات وإلكترونيات';
      case 'jackets':
        return 'جاكيتات شتوية';
      case 'accessories':
        return 'إكسسوارات وشنط';
      default:
        return cat;
    }
  };

  return (
    <div className="pb-20 min-h-screen">
      {/* Hero Banner — Adapts cleanly between Shopper-focused (referred) vs Dual-Intent (direct visitor) */}
      <div className="pt-3 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-[#030303] text-white border border-zinc-800 shadow-elevated p-6 sm:p-8 lg:p-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-brand/20 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#0084FF]/10 rounded-full blur-2xl pointer-events-none translate-x-1/3 translate-y-1/3" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-white mb-3">
                <span className="w-2 h-2 rounded-full bg-brand shadow-[0_0_8px_#0258ED] animate-pulse" />
                <span>
                  {isReferred
                    ? locale === 'ar'
                      ? 'متجر الشريك المعتمد — Ctrl YZ'
                      : 'Certified Partner Storefront — Ctrl YZ'
                    : locale === 'ar'
                    ? 'متجر وشبكة أفلييت الملابس — شتاء 2026'
                    : 'Apparel Store & Affiliate Network — Winter 2026'}
                </span>
              </div>

              <div className="mb-3">
                <Image
                  src="/ctrl-logo-transparent.png"
                  alt="Ctrl YZ"
                  width={160}
                  height={40}
                  priority
                  className="h-8 sm:h-10 w-auto object-contain"
                />
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white mb-2 leading-snug">
                {locale === 'ar'
                  ? 'كولكشن الهوديز الأوفر سايز — ميلتون قطن أصلي 420 GSM'
                  : 'Oversized Streetwear Hoodies — Heavyweight 420 GSM'}
              </h1>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl mb-5">
                {isReferred
                  ? locale === 'ar'
                    ? 'تصاميم جرافيك حصرية ثابتة ضد الغسيل، قطن مصري فاخر مبطن بوبرة دافئة، مع معاينة كاملة قبل الدفع وشحن سريع لجميع محافظات مصر.'
                    : 'Exclusive streetwear graphic hoodies, heavyweight cotton fleece with inspect-before-paying COD across Egypt.'
                  : locale === 'ar'
                  ? 'تسوّق مباشرة مع معاينة قبل الدفع — أو انضم كمسوق ملابس معتمد واربح عمولة من 220 إلى 260 ج.م على كل قطعة بدون رأس مال.'
                  : 'Shop heavyweight hoodies with cash-on-delivery inspection — or join our affiliate network and earn 220–260 EGP per hoodie with zero capital.'}
              </p>

              <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium">
                <a
                  href="#catalog-grid"
                  className="px-4 py-2.5 rounded-xl bg-white text-ink hover:bg-zinc-100 font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <ShoppingBag size={14} />
                  <span>{locale === 'ar' ? 'تسوّق الكولكشن الآن' : 'Shop Collection'}</span>
                </a>
                {!isReferred && (
                  <a
                    href="#affiliate-program"
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles size={14} className="text-[#38BDF8]" />
                    <span>{locale === 'ar' ? 'كيف تربح كمسوق؟' : 'How Affiliates Earn'}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Affiliate Conversion Box — Only emphasized for direct (non-referred) visitors */}
            {!isReferred && (
              <div className="flex-shrink-0 bg-white/5 border border-white/15 rounded-xl p-5 lg:w-72 text-center flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-[#38BDF8] uppercase tracking-wider block font-bold mb-1">
                    {locale === 'ar' ? 'هل تريد الربح معنا كمسوق؟' : 'Want to Earn as an Affiliate?'}
                  </span>
                  <span className="text-xl font-bold text-white block num-tabular">
                    {locale === 'ar' ? `أرباح حتى 260 ${currencySymbol}` : `Up to 260 ${currencySymbol}`}
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    {locale === 'ar'
                      ? 'صافي ربح على كل هودي بدون رأس مال — شحن ومعاينة وتحصيل علينا'
                      : 'Net profit per hoodie sold — zero inventory, we handle COD shipping'}
                  </p>
                </div>

                <Link
                  href="/join"
                  className="mt-4 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-subtle"
                >
                  <span>{locale === 'ar' ? 'ابدأ الربح كمسوق' : 'Join Affiliate Program'}</span>
                  <ArrowRight size={13} className={locale === 'ar' ? 'rotate-180' : ''} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Storefront Catalog Header & Filters */}
      <div id="catalog-grid" className="pt-6 pb-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
            {locale === 'ar' ? 'المتجر الرسمي المباشر' : 'Official Collection'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            {locale === 'ar' ? 'تشكيلة الشتاء العصرية' : 'Modern Winter Essentials'}
          </h2>
          <p className="text-xs text-ink-muted max-w-2xl mt-0.5">
            {locale === 'ar'
              ? 'خامات قطنية وحرارية فاخرة، تقفيل خياطة متقن، مع ميزة المعاينة قبل الاستلام والدفع كاش عند الباب.'
              : 'Premium heavyweight cottons, precision tailoring, with cash on delivery and inspection upon arrival.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-5 relative max-w-2xl">
          <Search
            size={16}
            strokeWidth={1.6}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            placeholder={
              locale === 'ar'
                ? 'ابحث باسم المنتج أو البراند أو الكود...'
                : 'Search collection, brand or SKU...'
            }
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
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 text-xs text-ink-muted">
          <span>
            {locale === 'ar'
              ? `المنتجات المتاحة (${filteredProducts.length})`
              : `Available items (${filteredProducts.length})`}
          </span>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            {locale === 'ar' ? 'معاينة قبل الدفع' : 'Inspect before paying'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-80 rounded-xl bg-zinc-100 animate-pulse border border-border"
              />
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const hasDiscount = Boolean(product.salePrice && product.salePrice < product.price);
              const effectivePrice = hasDiscount ? product.salePrice! : product.price;
              const isOutOfStock = product.stock <= 0;
              const isFav = favoriteIds.includes(product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => onProductClick(product)}
                  className="bg-white rounded-xl border border-border overflow-hidden hover:border-zinc-400 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-subtle"
                >
                  {/* Image container */}
                  <div className="relative aspect-[1245/1600] w-full bg-zinc-950 overflow-hidden border-b border-border flex items-center justify-center">
                    <SafeProductImage
                      src={product.images?.[0]}
                      alt={getName(product)}
                      className={`w-full h-full object-contain group-hover:scale-102 transition-transform duration-300 ${
                        isOutOfStock ? 'opacity-60' : ''
                      }`}
                    />

                    {/* Stock badge */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      {isOutOfStock ? (
                        <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded shadow-xs">
                          {locale === 'ar' ? 'نفد المخزون' : 'Out of Stock'}
                        </span>
                      ) : (
                        product.stock <= 20 && (
                          <span className="text-[10px] bg-white/95 text-ink font-medium px-2 py-0.5 rounded shadow-xs border border-border num-tabular">
                            {locale === 'ar' ? `متبقي ${product.stock}` : `${product.stock} left`}
                          </span>
                        )
                      )}
                    </div>

                    {/* Favorite heart button */}
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(product.id);
                        }}
                        aria-label={locale === 'ar' ? 'إضافة للمفضلة' : 'Save to favorites'}
                        className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/90 hover:bg-white border border-border flex items-center justify-center transition-colors shadow-xs"
                      >
                        <Heart
                          size={13}
                          className={
                            isFav ? 'fill-rose-500 text-rose-500' : 'text-neutral-500'
                          }
                        />
                      </button>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1">
                        <span className="font-semibold uppercase tracking-wider">
                          {product.brand}
                        </span>
                        <span>{product.sizes?.slice(0, 3).join(', ')}</span>
                      </div>

                      <h3 className="font-semibold text-sm text-ink leading-snug line-clamp-2 group-hover:text-brand transition-colors">
                        {getName(product)}
                      </h3>
                    </div>

                    <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-ink num-tabular">
                          {effectivePrice}
                        </span>
                        <span className="text-xs text-ink-muted font-normal">
                          {currencySymbol}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-ink-subtle line-through num-tabular">
                            {product.price}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProductClick(product);
                        }}
                        className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-ink hover:text-white text-ink text-[11px] font-medium transition-colors flex items-center gap-1"
                      >
                        <span>
                          {isOutOfStock
                            ? locale === 'ar'
                              ? 'نفد'
                              : 'Sold out'
                            : locale === 'ar'
                            ? 'تفاصيل'
                            : 'View'}
                        </span>
                        <ArrowRight
                          size={11}
                          strokeWidth={1.6}
                          className={locale === 'ar' ? 'rotate-180' : ''}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* First-Time Visitor Affiliate Value Proposition (shown for direct visitors, hidden for referred shoppers) */}
      {!isReferred && <AffiliateValuePropSection showJoinLink={true} />}
    </div>
  );
}
