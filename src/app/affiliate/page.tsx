'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  PackagePlus,
  Package,
  Wallet,
  Link2,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useProducts } from '@/hooks/useProducts';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { getOrdersByAffiliate } from '@/lib/dataService';
import type { Product, Order } from '@/lib/types';
import AffiliateProducts from '@/components/affiliate/AffiliateProducts';
import CreateOrderForm from '@/components/affiliate/CreateOrderForm';
import AffiliateOrders from '@/components/affiliate/AffiliateOrders';
import AffiliateWallet from '@/components/affiliate/AffiliateWallet';
import AffiliateStoreLink from '@/components/affiliate/AffiliateStoreLink';

type AffiliateTab = 'products' | 'create_order' | 'orders' | 'wallet' | 'links';

export default function AffiliatePage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin, isActiveMarketer, currentMarketer, refreshSession } = useAuth();
  const { t } = useLanguage();
  const { currencySymbol } = useSettings();
  const { products } = useProducts();

  const [activeTab, setActiveTab] = useState<AffiliateTab>('products');
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const activeMarketer = currentMarketer;

  // Enforce strict RBAC & active affiliate gate (defense-in-depth alongside middleware.ts)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/affiliate');
      return;
    }
    if (!isAdmin) {
      if (!currentMarketer) {
        router.replace('/login?step=onboarding');
        return;
      }
      if (!isActiveMarketer) {
        router.replace('/affiliate/status');
      }
    }
  }, [authLoading, user, isAdmin, currentMarketer, isActiveMarketer, router]);

  const activeMarketerId = activeMarketer?.id;

  const refreshMarketerAndOrders = useCallback(async () => {
    if (!activeMarketerId) return;
    try {
      const [data] = await Promise.all([
        getOrdersByAffiliate(activeMarketerId),
        refreshSession(),
      ]);
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  }, [activeMarketerId, refreshSession]);

  useRealtimeSync(() => {
    refreshMarketerAndOrders();
  });

  useEffect(() => {
    refreshMarketerAndOrders();

    const handleUpdate = () => {
      refreshMarketerAndOrders();
    };

    window.addEventListener('affiliate_data_changed', handleUpdate);
    return () => window.removeEventListener('affiliate_data_changed', handleUpdate);
  }, [refreshMarketerAndOrders]);

  const handleSelectProductForOrder = (product: Product) => {
    setSelectedProductForOrder(product);
    setActiveTab('create_order');
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-canvas text-xs text-ink-muted">
        جاري التحقق من جلسة المسوق...
      </div>
    );
  }

  if (!activeMarketer || (!isAdmin && !isActiveMarketer)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-canvas">
        <div className="w-14 h-14 bg-white border border-border text-ink rounded-xl flex items-center justify-center mb-4 shadow-xs">
          <TrendingUp size={24} strokeWidth={1.6} />
        </div>
        <h2 className="text-xl font-bold text-ink mb-1">بوابة المسوقين المعتمدة</h2>
        <p className="text-sm text-neutral-500 mb-6">
          {isAdmin
            ? 'حسابك الحالي بحالة مدير منصة بدون ملف مسوق مرتبط. يمكنك إدارة جميع المسوقين من لوحة العمليات.'
            : 'يرجى تسجيل الدخول واستكمال تفعيل حساب المسوق للمتابعة.'}
        </p>
        <Link
          href={isAdmin ? '/admin' : '/affiliate/status'}
          className="px-6 py-2.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          {isAdmin ? 'الانتقال إلى لوحة الإدارة' : 'عرض حالة طلب الانضمام'}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Top Welcome & Obsidian Financial Header */}
      <section className="bg-white border-b border-border py-6">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Marketer identity */}
          <div className="flex items-center gap-4">
            {activeMarketer.avatar || user?.avatarUrl ? (
              <Image
                src={activeMarketer.avatar || user?.avatarUrl || ''}
                alt={activeMarketer.name}
                width={56}
                height={56}
                unoptimized
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border border-brand/30 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-ink text-white flex items-center justify-center font-bold text-xl border border-neutral-800 flex-shrink-0">
                {activeMarketer.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg sm:text-xl font-bold text-ink">
                  {t('affiliate.welcome')} {activeMarketer.name}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck size={12} strokeWidth={1.6} />
                  {t('affiliate.verifiedBadge')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                <span>
                  {t('affiliate.referralCode')}: <strong className="font-mono text-ink num-tabular">{activeMarketer.affiliateCode}</strong>
                </span>
                <span className="text-neutral-300">•</span>
                <span>{t('affiliate.phone')}: <strong className="font-mono text-ink num-tabular">{activeMarketer.phone}</strong></span>
                <span className="text-neutral-300">•</span>
                <span>
                  {t('affiliate.clicks')}: <strong className="font-mono text-ink num-tabular">{activeMarketer.clicksCount ?? 0}</strong>{' '}
                  ({t('affiliate.conversion')} <strong className="font-mono text-emerald-700 num-tabular">{activeMarketer.conversionRate ?? 0}%</strong>)
                </span>
              </div>
            </div>
          </div>

          {/* Obsidian Wallet Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-ink text-white rounded-xl border border-neutral-800 p-4 sm:px-5 sm:py-3 flex flex-wrap items-center gap-5 shadow-xs">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium mb-1">
                  <span className="w-2 h-2 rounded-full bg-financial animate-pulse" />
                  <span>{t('affiliate.availableBalance')}</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-white num-tabular">
                  {activeMarketer.walletBalance.toLocaleString()}{' '}
                  <span className="text-xs font-arabic font-normal text-neutral-400">{currencySymbol}</span>
                </div>
              </div>

              <div className="w-px h-10 bg-neutral-800" />

              <div>
                <div className="text-[11px] text-amber-400 font-medium mb-1">
                  {t('affiliate.lockedBalance')}
                </div>
                <div className="text-base sm:text-lg font-bold font-mono text-amber-300 num-tabular">
                  {(activeMarketer.lockedBalance ?? 0).toLocaleString()}{' '}
                  <span className="text-xs font-arabic font-normal text-neutral-500">{currencySymbol}</span>
                </div>
              </div>

              <div className="w-px h-10 bg-neutral-800" />

              <div>
                <div className="text-[11px] text-neutral-400 font-medium mb-1">
                  {t('affiliate.pendingBalance')}
                </div>
                <div className="text-base sm:text-lg font-bold font-mono text-neutral-300 num-tabular">
                  {activeMarketer.pendingBalance.toLocaleString()}{' '}
                  <span className="text-xs font-arabic font-normal text-neutral-500">{currencySymbol}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('wallet')}
                className="mr-auto sm:mr-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1"
              >
                <span>{t('affiliate.walletBtn')}</span>
                <ArrowUpRight size={13} strokeWidth={1.6} />
              </button>
            </div>

            <button
              onClick={() => setActiveTab('create_order')}
              className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-3 rounded-xl font-semibold text-xs shadow-xs active:scale-[0.98] transition-all"
            >
              <PackagePlus size={16} strokeWidth={1.6} />
              <span>{t('affiliate.createOrderBtn')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Segmented Control Bar */}
      <section className="bg-white border-b border-border sticky top-14 z-30">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 hide-scrollbar">
            {[
              { id: 'products', label: t('affiliate.tabProducts'), icon: ShoppingBag, badge: products.length },
              { id: 'create_order', label: t('affiliate.tabCreateOrder'), icon: PackagePlus },
              { id: 'orders', label: t('affiliate.tabOrders'), icon: Package, badge: orders.length },
              { id: 'wallet', label: t('affiliate.tabWallet'), icon: Wallet },
              { id: 'links', label: t('affiliate.tabLinks'), icon: Link2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as AffiliateTab);
                    if (tab.id !== 'create_order') setSelectedProductForOrder(null);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-ink text-white font-semibold'
                      : 'text-neutral-600 hover:text-ink hover:bg-neutral-100'
                  }`}
                >
                  <Icon size={15} strokeWidth={1.6} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono num-tabular ${
                        isActive ? 'bg-brand text-white font-bold' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Affiliate Campaign Highlight Strip (Black, White & Electric Blue) */}
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-5">
        <div className="relative overflow-hidden rounded-xl bg-[#030303] text-white border border-zinc-800 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-subtle">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-12 h-12 rounded-lg bg-white/5 border border-white/10 items-center justify-center flex-shrink-0">
              <Image src="/ctrl-logo-transparent.png" alt="Ctrl YZ" width={96} height={18} className="h-4 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold bg-brand text-white px-2 py-0.5 rounded uppercase tracking-wider">
                  كامبين الشتاء 2026
                </span>
                <span className="text-xs text-zinc-400">عمولات تسويق مباشرة</span>
              </div>
              <p className="text-xs text-zinc-200">
                اكسب من <strong className="text-white num-tabular font-bold">220 ج.م إلى 260 ج.م</strong> صافي ربح على كل قطعة هودي تسجلها لعميلك. المعاينة والشحن علينا!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={() => setActiveTab('products')}
              className="px-3.5 py-1.5 rounded-lg bg-white text-ink hover:bg-zinc-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <span>سوق المنتجات ({products.length})</span>
              <ArrowRight size={12} className="rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Post-Signup Activation Checklist (shown clearly when marketer has 0 orders yet) */}
      {!loadingOrders && orders.length === 0 && (
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-5">
          <div className="bg-white rounded-xl border border-brand/25 p-5 shadow-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-bold text-ink">
                  ابدأ أول عمولة لك الآن — خطوات التفعيل السريعة
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  أكمل هذه الخطوات الثلاث لتسجيل أول طلب وتحقيق أول ربح في محفظتك
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-brand bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full self-start sm:self-center">
                {(activeMarketer.clicksCount ?? 0) > 0 ? '1 / 3 مكتمل' : '0 / 3 خطوات'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('links')}
                className="p-3.5 rounded-xl bg-neutral-50 hover:bg-blue-50/50 border border-border hover:border-brand/40 text-right transition-colors flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">1. انسخ رابط متجرك الشخصي</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (activeMarketer.clicksCount ?? 0) > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-brand'
                    }`}
                  >
                    {(activeMarketer.clicksCount ?? 0) > 0 ? 'تم التتبع ✓' : 'ابدأ الآن'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  احصل على رابطك المختصر (/r/{activeMarketer.affiliateCode}) وكود QR لبدء استقطاب العملاء بكوكي 30 يوماً.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className="p-3.5 rounded-xl bg-neutral-50 hover:bg-blue-50/50 border border-border hover:border-brand/40 text-right transition-colors flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">2. تصفح الكتالوج ونصوص الإعلانات</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                    {products.length} منتج
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  اختر الهوديز الأعلى عمولة، احسب صافي ربحك، وانسخ نصوص الإعلانات الجاهزة لمنشوراتك.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('create_order')}
                className="p-3.5 rounded-xl bg-neutral-50 hover:bg-emerald-50/60 border border-border hover:border-emerald-300 text-right transition-colors flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink">3. سجّل أول طلب لعميلك</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    أول عمولة
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  أدخل بيانات أول عميل وحدد سعر البيع لنشحن له فوراً وتُضاف عمولتك لمحفظتك.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Content Area */}
      <main className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-6">
        {activeTab === 'products' && (
          <AffiliateProducts
            products={products}
            onSelectForOrder={handleSelectProductForOrder}
          />
        )}

        {activeTab === 'create_order' && (
          <CreateOrderForm
            products={products}
            marketer={activeMarketer}
            preSelectedProduct={selectedProductForOrder}
            onOrderSuccess={() => {
              refreshMarketerAndOrders();
            }}
          />
        )}

        {activeTab === 'orders' && (
          <AffiliateOrders orders={orders} />
        )}

        {activeTab === 'wallet' && (
          <AffiliateWallet marketer={activeMarketer} />
        )}

        {activeTab === 'links' && (
          <AffiliateStoreLink marketer={activeMarketer} />
        )}
      </main>
    </div>
  );
}
