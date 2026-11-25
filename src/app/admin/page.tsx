'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  Truck,
  Settings,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import {
  getOrders,
  getProducts,
  getMarketers,
  getWithdrawals,
} from '@/lib/dataService';
import type { Order, Product, Marketer, WithdrawalRequest } from '@/lib/types';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminMarketers from '@/components/admin/AdminMarketers';
import AdminWithdrawals from '@/components/admin/AdminWithdrawals';
import AdminShipping from '@/components/admin/AdminShipping';
import AdminSettings from '@/components/admin/AdminSettings';

type AdminTab = 'dashboard' | 'products' | 'orders' | 'marketers' | 'withdrawals' | 'shipping' | 'settings';

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/login?redirect=/admin');
    }
  }, [authLoading, isAdmin, router]);

  // Real-time synchronization hook: automatically refreshes data when changes occur on server
  const { isConnected } = useRealtimeSync(() => {
    loadData();
  });

  const loadData = async () => {
    try {
      const [ordList, prodList, markList, withList] = await Promise.all([
        getOrders(),
        getProducts({ includeInactive: true }),
        getMarketers(),
        getWithdrawals(),
      ]);
      setOrders(ordList);
      setProducts(prodList);
      setMarketers(markList);
      setWithdrawals(withList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('affiliate_data_changed', handleUpdate);
    return () => window.removeEventListener('affiliate_data_changed', handleUpdate);
  }, []);

  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const pendingMarketersCount = marketers.filter((m) => m.status === 'pending').length;

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-canvas text-xs text-ink-muted">
        جاري التحقق من صلاحيات الإدارة...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      {/* Top Admin Header Bar */}
      <section className="bg-ink text-white py-4 border-b border-neutral-800">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 px-3 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center">
              <Image src="/ctrl-logo-transparent.png" alt="Ctrl YZ" width={120} height={24} className="h-5 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white">
                  {t('adminTabs.consoleTitle')}
                </h1>
                <span className="text-[10px] bg-brand/20 text-[#38BDF8] border border-brand/40 px-2 py-0.5 rounded font-mono">
                  Operations Console
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Realtime DB Synced</span>
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {t('adminTabs.consoleSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/affiliate"
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp size={13} strokeWidth={1.6} className="text-emerald-400" />
              <span>{t('adminTabs.affiliatePortalBtn')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Tabs Navigation Bar */}
      <section className="bg-white border-b border-border sticky top-14 z-30">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 hide-scrollbar">
            {[
              { id: 'dashboard', label: t('adminTabs.dashboard'), icon: LayoutDashboard },
              { id: 'orders', label: t('adminTabs.orders'), icon: ShoppingCart, badge: pendingOrdersCount, badgeColor: 'bg-amber-600' },
              { id: 'products', label: t('adminTabs.products'), icon: Package, badge: products.length },
              {
                id: 'marketers',
                label: t('adminTabs.marketers'),
                icon: Users,
                badge: pendingMarketersCount > 0 ? pendingMarketersCount : marketers.length,
                badgeColor: pendingMarketersCount > 0 ? 'bg-amber-600' : undefined,
              },
              { id: 'withdrawals', label: t('adminTabs.withdrawals'), icon: Wallet, badge: pendingWithdrawalsCount, badgeColor: 'bg-rose-600' },
              { id: 'shipping', label: t('adminTabs.shipping'), icon: Truck },
              { id: 'settings', label: t('adminTabs.settings'), icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-ink text-white font-semibold'
                      : 'text-neutral-600 hover:text-ink hover:bg-neutral-100'
                  }`}
                >
                  <Icon size={15} strokeWidth={1.6} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono num-tabular ${
                        isActive
                          ? 'bg-neutral-800 text-neutral-200'
                          : tab.badgeColor
                          ? `${tab.badgeColor} text-white`
                          : 'bg-neutral-200 text-neutral-700'
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

      {/* Main Admin Content */}
      <main className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-6">
        {activeTab === 'dashboard' && (
          <AdminDashboard
            orders={orders}
            products={products}
            marketers={marketers}
            withdrawals={withdrawals}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'products' && (
          <AdminProducts products={products} onRefresh={loadData} />
        )}

        {activeTab === 'orders' && (
          <AdminOrders orders={orders} onRefresh={loadData} />
        )}

        {activeTab === 'marketers' && (
          <AdminMarketers marketers={marketers} onRefresh={loadData} />
        )}

        {activeTab === 'withdrawals' && (
          <AdminWithdrawals withdrawals={withdrawals} onRefresh={loadData} />
        )}

        {activeTab === 'shipping' && (
          <AdminShipping />
        )}

        {activeTab === 'settings' && (
          <AdminSettings />
        )}
      </main>
    </div>
  );
}
