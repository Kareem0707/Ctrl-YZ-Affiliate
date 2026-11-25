'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useProducts } from '@/hooks/useProducts';
import type { PublicReferralInfo } from '@/lib/dataService';
import type { Product } from '@/lib/types';
import SafeProductImage from '@/components/common/SafeProductImage';
import DiscoverScreen from './DiscoverScreen';
import ProductDetails from './ProductDetails';
import CartScreen from './CartScreen';
import CheckoutScreen from './CheckoutScreen';
import OrderTrackingScreen from './OrderTrackingScreen';
import BottomNav from './BottomNav';

type Screen = 'discover' | 'favorites' | 'product' | 'cart' | 'checkout' | 'trackOrder';

const FAVORITES_STORAGE_KEY = 'ctrl-yz-favorites';

export default function StorefrontApp() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('discover');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [referralMarketer, setReferralMarketer] = useState<PublicReferralInfo | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const { addToCart, cartCount } = useCart();
  const { dir, locale } = useLanguage();
  const { user, isAdmin, isActiveMarketer, currentMarketer } = useAuth();
  const { currencySymbol } = useSettings();
  const { products, loading } = useProducts();

  // Hydrate saved favorites from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavoriteIds(parsed.filter((id): id is string => typeof id === 'string'));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [productId, ...prev];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleGoToCart = useCallback(() => {
    setActiveTab('cart');
    setScreen('cart');
  }, []);

  // Capture Affiliate Referral from URL (30-day server-side HttpOnly cookie + deduplicated click tracking)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOpenCart = () => {
      handleGoToCart();
    };
    window.addEventListener('ctrl_open_cart', handleOpenCart);

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref')?.trim();
    const trackUrl = ref
      ? `/api/affiliate/track?ref=${encodeURIComponent(ref)}&landing=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`
      : '/api/affiliate/track';

    fetch(trackUrl, { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.valid && data?.id) {
          setReferralMarketer({
            id: data.id,
            affiliateCode: data.affiliateCode,
            name: data.displayName || data.affiliateCode,
          });
        }
      })
      .catch(() => {
        // Ignore transient tracking errors on storefront
      });

    return () => {
      window.removeEventListener('ctrl_open_cart', handleOpenCart);
    };
  }, [handleGoToCart]);

  const favoriteProducts = useMemo(
    () => products.filter((p) => p.isActive && favoriteIds.includes(p.id)),
    [products, favoriteIds]
  );

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setScreen('product');
  };

  const handleBack = () => {
    if (screen === 'product') {
      setScreen(activeTab === 'favorites' ? 'favorites' : 'discover');
    } else if (screen === 'cart') {
      setScreen('discover');
      setActiveTab('home');
    } else if (screen === 'checkout') {
      setScreen('cart');
    } else if (screen === 'trackOrder' || screen === 'favorites') {
      setScreen('discover');
      setActiveTab('home');
    }
  };

  const handleAddToCart = (
    product: Product,
    size: string,
    color: string,
    variantId?: string
  ) => {
    const added = addToCart(product, size, color, variantId);
    if (added) {
      setActiveTab('cart');
      setScreen('cart');
    }
  };

  const handleGoToCheckout = () => {
    setScreen('checkout');
  };

  const handleOrderPlaced = () => {
    setActiveTab('transactions');
    setScreen('trackOrder');
  };

  const handleContinueShopping = () => {
    setScreen('discover');
    setActiveTab('home');
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'profile') {
      if (isAdmin) {
        router.push('/admin');
      } else if (isActiveMarketer) {
        router.push('/affiliate');
      } else if (currentMarketer) {
        router.push('/affiliate/status');
      } else if (user) {
        router.push('/login?step=onboarding');
      } else {
        router.push('/login');
      }
      return;
    }

    setActiveTab(tab);
    if (tab === 'home') setScreen('discover');
    if (tab === 'favorites') setScreen('favorites');
    if (tab === 'cart') setScreen('cart');
    if (tab === 'transactions') setScreen('trackOrder');
  };

  // Strictly hide BottomNav on product details, cart, and checkout so it never covers sticky CTAs
  const showBottomNav =
    screen !== 'product' && screen !== 'cart' && screen !== 'checkout';

  return (
    <div
      dir={dir}
      className="w-full max-w-[1536px] mx-auto min-h-screen bg-canvas relative pb-32 md:pb-16 px-4 sm:px-6 lg:px-10 xl:px-12"
    >
      {/* Certified Affiliate Referral Banner (When visiting through a marketer's link or active 30-day cookie) */}
      {referralMarketer && (
        <div className="bg-emerald-950 text-emerald-300 text-xs py-2 px-4 text-center flex items-center justify-center gap-2 border-b border-emerald-900 rounded-b-xl mb-2">
          <CheckCircle2 size={13} strokeWidth={1.6} />
          <span>
            {locale === 'ar'
              ? `أهلاً بك! أنت تتسوق الآن عبر متجر الشريك المعتمد: ${referralMarketer.name}`
              : `Shopping via certified partner store: ${referralMarketer.name}`}
          </span>
        </div>
      )}

      {screen === 'discover' && (
        <DiscoverScreen
          products={products}
          loading={loading}
          onProductClick={handleProductClick}
          isReferred={Boolean(referralMarketer)}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {screen === 'favorites' && (
        <div className="pt-6 pb-20 min-h-[70vh]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
                <Heart size={20} className="text-rose-500 fill-rose-500" />
                <span>{locale === 'ar' ? 'المنتجات المفضلة' : 'Saved Favorites'}</span>
              </h1>
              <p className="text-xs text-ink-muted mt-0.5 num-tabular">
                {locale === 'ar'
                  ? `${favoriteProducts.length} منتج محفوظ`
                  : `${favoriteProducts.length} saved items`}
              </p>
            </div>
            <button
              onClick={handleContinueShopping}
              className="px-3.5 py-2 rounded-lg bg-white border border-border text-xs font-semibold text-ink hover:bg-neutral-50 transition-colors"
            >
              {locale === 'ar' ? 'تصفح المتجر' : 'Browse Store'}
            </button>
          </div>

          {favoriteProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-rose-50 border border-rose-100 text-rose-400 flex items-center justify-center mx-auto mb-3">
                <Heart size={24} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-bold text-ink mb-1">
                {locale === 'ar' ? 'قائمة المفضلة فارغة حالياً' : 'Your wishlist is empty'}
              </p>
              <p className="text-xs text-ink-muted mb-5">
                {locale === 'ar'
                  ? 'اضغط على أيقونة القلب على أي منتج لحفظه والرجوع إليه سريعاً'
                  : 'Tap the heart icon on any product to save it here'}
              </p>
              <button
                onClick={handleContinueShopping}
                className="px-5 py-2.5 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5"
              >
                <ShoppingBag size={14} />
                <span>{locale === 'ar' ? 'استكشف الكولكشن' : 'Explore Collection'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {favoriteProducts.map((product) => {
                const effectivePrice =
                  product.salePrice && product.salePrice < product.price
                    ? product.salePrice
                    : product.price;
                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white rounded-xl border border-border overflow-hidden hover:border-zinc-400 transition-all cursor-pointer flex flex-col justify-between group shadow-subtle"
                  >
                    <div className="relative aspect-[1245/1600] w-full bg-zinc-950 border-b border-border overflow-hidden">
                      <SafeProductImage
                        src={product.images?.[0]}
                        alt={locale === 'ar' ? product.name_ar : product.name_en}
                        className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-300"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(product.id);
                        }}
                        aria-label={locale === 'ar' ? 'إزالة من المفضلة' : 'Remove favorite'}
                        className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-white/95 border border-border flex items-center justify-center text-rose-500 shadow-xs"
                      >
                        <Heart size={14} className="fill-rose-500" />
                      </button>
                    </div>
                    <div className="p-3.5 space-y-2">
                      <h3 className="font-semibold text-xs sm:text-sm text-ink line-clamp-2">
                        {locale === 'ar' ? product.name_ar : product.name_en}
                      </h3>
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                        <span className="text-sm font-bold text-ink font-mono num-tabular">
                          {effectivePrice} <span className="text-[11px] font-sans font-normal text-ink-muted">{currencySymbol}</span>
                        </span>
                        <span className="text-[11px] text-brand font-semibold inline-flex items-center gap-0.5">
                          <span>{locale === 'ar' ? 'عرض' : 'View'}</span>
                          <ArrowRight size={11} className={locale === 'ar' ? 'rotate-180' : ''} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {screen === 'product' && selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onBack={handleBack}
          onAddToCart={handleAddToCart}
          isFavorite={favoriteIds.includes(selectedProduct.id)}
          onToggleFavorite={toggleFavorite}
        />
      )}

      {screen === 'cart' && (
        <CartScreen onBack={handleBack} onNext={handleGoToCheckout} />
      )}

      {screen === 'checkout' && (
        <CheckoutScreen
          onBack={handleBack}
          onOrderPlaced={handleOrderPlaced}
          onContinueShopping={handleContinueShopping}
        />
      )}

      {screen === 'trackOrder' && <OrderTrackingScreen onBack={handleBack} />}

      {/* Mobile-only Floating Concave Liquid Navigation Bar (hidden on desktop & product/cart/checkout) */}
      {showBottomNav && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          cartCount={cartCount}
          onCartClick={handleGoToCart}
        />
      )}
    </div>
  );
}
