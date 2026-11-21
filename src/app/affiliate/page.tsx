'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProducts } from '@/hooks/useProducts';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { getOrdersByAffiliate, getMarketers, getMarketerById } from '@/lib/dataService';
import type { Product, Order, Marketer } from '@/lib/types';
import AffiliateProducts from '@/components/affiliate/AffiliateProducts';
import CreateOrderForm from '@/components/affiliate/CreateOrderForm';
import AffiliateOrders from '@/components/affiliate/AffiliateOrders';
import AffiliateWallet from '@/components/affiliate/AffiliateWallet';
import AffiliateStoreLink from '@/components/affiliate/AffiliateStoreLink';

type AffiliateTab = 'products' | 'create_order' | 'orders' | 'wallet' | 'links';

export default function AffiliatePage() {
  const { currentMarketer, loginAsDemoMarketer } = useAuth();
  const { locale } = useLanguage();
  const { products, loading: productsLoading } = useProducts();

  const [activeTab, setActiveTab] = useState<AffiliateTab>('products');
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Active marketer: fallback to first marketer if not logged in
  const [activeMarketer, setActiveMarketer] = useState<Marketer | null>(currentMarketer);

  useEffect(() => {
    if (currentMarketer) {
      setActiveMarketer(currentMarketer);
    } else {
      getMarketers().then((list) => {
        if (list.length > 0) setActiveMarketer(list[0]);
      });
    }
  }, [currentMarketer]);

  const refreshMarketerAndOrders = async () => {
    if (!activeMarketer) return;
    try {
      const [freshMarketer, data] = await Promise.all([
        getMarketerById(activeMarketer.id),
        getOrdersByAffiliate(activeMarketer.id),
      ]);
      if (freshMarketer) setActiveMarketer(freshMarketer);
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

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
  }, [activeMarketer?.id]);

  const handleSelectProductForOrder = (product: Product) => {
    setSelectedProductForOrder(product);
    setActiveTab('create_order');
  };

  if (!activeMarketer) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-canvas">
        <div className="w-14 h-14 bg-white border border-border text-ink rounded-xl flex items-center justify-center mb-4 shadow-xs">
          <TrendingUp size={24} strokeWidth={1.6} />
        </div>
        <h2 className="text-xl font-bold text-ink mb-1">بوابة المسوق المعتمد</h2>
        <p className="text-sm text-neutral-500 mb-6">يرجى تسجيل الدخول أو اختيار مسوق تجريبي للبدء</p>
        <button
          onClick={() => loginAsDemoMarketer('marketer-001')}
          className="px-6 py-2.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors"
        >
          الدخول كأحمد عادل (مسوق تجريبي)
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Top Welcome & Obsidian Financial Header */}
      <section className="bg-white border-b border-border py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Marketer identity */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-ink text-white flex items-center justify-center font-bold text-xl border border-neutral-800 flex-shrink-0">
              {activeMarketer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg sm:text-xl font-bold text-ink">
                  مرحباً، {activeMarketer.name}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck size={12} strokeWidth={1.6} />
                  مسوق معتمد
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                <span>
                  كود الإحالة: <strong className="font-mono text-ink num-tabular">{activeMarketer.affiliateCode}</strong>
                </span>
                <span className="text-neutral-300">•</span>
                <span>الهاتف: <strong className="font-mono text-ink num-tabular">{activeMarketer.phone}</strong></span>
              </div>
            </div>
          </div>

          {/* Obsidian Wallet Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-ink text-white rounded-xl border border-neutral-800 p-4 sm:px-5 sm:py-3 flex items-center gap-6 shadow-xs">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium mb-1">
                  <span className="w-2 h-2 rounded-full bg-financial animate-pulse" />
                  <span>الرصيد المتاح للسحب</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-white num-tabular">
                  {activeMarketer.walletBalance.toLocaleString()} <span className="text-xs font-arabic font-normal text-neutral-400">ج.م</span>
                </div>
              </div>

              <div className="w-px h-10 bg-neutral-800" />

              <div>
                <div className="text-[11px] text-neutral-400 font-medium mb-1">
                  الرصيد المعلق
                </div>
                <div className="text-base sm:text-lg font-bold font-mono text-neutral-300 num-tabular">
                  {activeMarketer.pendingBalance.toLocaleString()} <span className="text-xs font-arabic font-normal text-neutral-500">ج.م</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('wallet')}
                className="mr-auto sm:mr-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1"
              >
                <span>المحفظة</span>
                <ArrowUpRight size={13} strokeWidth={1.6} />
              </button>
            </div>

            <button
              onClick={() => setActiveTab('create_order')}
              className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-3 rounded-xl font-semibold text-xs shadow-xs active:scale-[0.98] transition-all"
            >
              <PackagePlus size={16} strokeWidth={1.6} />
              <span>تسجيل طلب لعميل</span>
            </button>
          </div>
        </div>
      </section>

      {/* Segmented Control Bar */}
      <section className="bg-white border-b border-border sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 hide-scrollbar">
            {[
              { id: 'products', label: 'سوق المنتجات', icon: ShoppingBag, badge: products.length },
              { id: 'create_order', label: 'تسجيل طلب لعميل', icon: PackagePlus },
              { id: 'orders', label: 'طلباتي', icon: Package, badge: orders.length },
              { id: 'wallet', label: 'المحفظة والأرباح', icon: Wallet },
              { id: 'links', label: 'متجري وروابط الإحالة', icon: Link2 },
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <div className="relative overflow-hidden rounded-xl bg-[#030303] text-white border border-zinc-800 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-subtle">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-12 h-12 rounded-lg bg-white/5 border border-white/10 items-center justify-center flex-shrink-0">
              <img src="/ctrl-logo-transparent.png" alt="Ctrl YZ" className="h-4 w-auto object-contain" />
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

      {/* Main Tab Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'products' && (
          <AffiliateProducts
            products={products}
            onSelectForOrder={handleSelectProductForOrder}
          />
        )}

        {activeTab === 'create_order' && (
          <CreateOrderForm
            products={products}
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
