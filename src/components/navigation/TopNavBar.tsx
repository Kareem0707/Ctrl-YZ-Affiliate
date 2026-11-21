'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  TrendingUp,
  ShieldCheck,
  Truck,
  ChevronDown,
  LogOut,
  Wallet,
  ArrowRight,
  User,
  Globe,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TopNavBar() {
  const pathname = usePathname();
  const { user, isAdmin, isMarketer, currentMarketer, loginAsDemoAdmin, loginAsDemoMarketer, logout } = useAuth();
  const { locale, toggleLanguage } = useLanguage();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    {
      href: '/',
      label_ar: 'المتجر',
      label_en: 'Store',
      icon: ShoppingBag,
      active: pathname === '/',
    },
    {
      href: '/affiliate',
      label_ar: 'بوابة المسوقين',
      label_en: 'Affiliate Portal',
      icon: TrendingUp,
      active: pathname.startsWith('/affiliate'),
      badge: 'أرباح',
    },
    {
      href: '/admin',
      label_ar: 'لوحة الإدارة',
      label_en: 'Admin Cockpit',
      icon: ShieldCheck,
      active: pathname.startsWith('/admin'),
    },
    {
      href: '/track-order',
      label_ar: 'تتبع الشحنة',
      label_en: 'Track Shipment',
      icon: Truck,
      active: pathname === '/track-order',
    },
    {
      href: '/liquid-nav',
      label_ar: 'الموبايل العائم',
      label_en: 'Liquid Mobile Nav',
      icon: Smartphone,
      active: pathname === '/liquid-nav',
      badge: 'NEW',
    },
  ];

  return (
    <>
      {/* Editorial Announcement Strip */}
      <div className="bg-[#030303] text-white text-[12px] py-1.5 px-4 font-normal tracking-normal border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand shadow-[0_0_8px_#0258ED] animate-pulse" />
            <span className="text-zinc-300">
              {locale === 'ar'
                ? 'كامبين الشتاء الرسمي 2026 — عمولات تبدأ من 220 وتصل إلى 260 ج.م على كل قطعة هودي'
                : 'Winter 2026 Official Campaign — Commissions from 220 to 260 EGP per hoodie'}
            </span>
          </div>
          <Link
            href="/affiliate"
            className="hidden sm:inline-flex items-center gap-1 text-[#38BDF8] hover:text-white underline underline-offset-4 font-medium transition-colors"
          >
            <span>{locale === 'ar' ? 'ابدأ التسويق في الكامبين' : 'Join Campaign'}</span>
            <ArrowRight size={12} className={locale === 'ar' ? 'rotate-180' : ''} />
          </Link>
        </div>
      </div>

      {/* Main Global Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Brand Logo & Authority Label (Right in RTL) */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="flex items-center py-1">
                  <img
                    src="/ctrl-logo-light.png"
                    alt="Ctrl YZ"
                    className="h-7 sm:h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
                  />
                </div>
                <div className="hidden sm:flex flex-col border-r border-border pr-3">
                  <span className="text-[10px] font-bold text-brand tracking-widest uppercase leading-none">
                    Official
                  </span>
                  <span className="text-[10px] font-medium text-ink-muted leading-tight mt-0.5">
                    {locale === 'ar' ? 'منصة الأفلييت والتجارة' : 'Affiliate Commerce'}
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links (Center) */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      item.active
                        ? 'bg-zinc-100 text-ink font-semibold'
                        : 'text-ink-muted hover:text-ink hover:bg-zinc-50'
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.6} />
                    <span>{locale === 'ar' ? item.label_ar : item.label_en}</span>
                    {item.badge && (
                      <span className="text-[10px] bg-financial/10 text-financial border border-financial/20 font-bold px-1.5 py-0.2 rounded-md num-tabular">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Controls: Compact Language Switcher + Demo Account Pill (Left in RTL) */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-ink-muted hover:text-ink hover:bg-zinc-100 border border-transparent transition-colors flex items-center gap-1"
                title={locale === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
              >
                <Globe size={13} strokeWidth={1.6} />
                <span className="num-tabular uppercase">{locale === 'ar' ? 'EN' : 'عربي'}</span>
              </button>

              <div className="h-4 w-px bg-border" />

              {/* Demo Account Switcher Pill */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-border text-ink text-xs font-medium transition-all"
                >
                  <div className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[10px] font-bold">
                    {isAdmin ? 'A' : isMarketer ? 'M' : 'U'}
                  </div>
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-semibold leading-tight text-ink">
                      {user?.displayName?.split(' ')[0] || (isAdmin ? 'الإدارة' : 'المسوق')}
                    </span>
                    <span className="text-[10px] text-ink-muted leading-tight">
                      {isAdmin ? 'مدير المنصة' : isMarketer ? `كود: ${currentMarketer?.affiliateCode || 'AFF'}` : 'زائر'}
                    </span>
                  </div>
                  <ChevronDown size={12} strokeWidth={1.6} className="text-ink-muted" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute left-0 sm:left-auto right-0 mt-2 w-64 bg-white rounded-xl shadow-elevated border border-border py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                    onClick={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-[10px] text-ink-muted font-medium uppercase tracking-wider">
                        {locale === 'ar' ? 'الحساب النشط حالياً' : 'Active Account'}
                      </p>
                      <p className="text-xs font-bold text-ink mt-0.5">
                        {user?.displayName || 'حساب تجريبي'}
                      </p>
                      {isMarketer && currentMarketer && (
                        <div className="mt-2 bg-financial-subtle border border-financial-border px-2 py-1 rounded-md text-[11px] font-medium text-financial flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Wallet size={11} strokeWidth={1.6} /> {locale === 'ar' ? 'المتاح للسحب:' : 'Available:'}
                          </span>
                          <span className="font-bold num-tabular">{currentMarketer.walletBalance} ج.م</span>
                        </div>
                      )}
                    </div>

                    <div className="px-1.5 py-1">
                      <p className="px-2 py-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                        {locale === 'ar' ? 'تبديل الحساب السريع للتجربة' : 'Switch Persona'}
                      </p>
                      <button
                        onClick={() => loginAsDemoMarketer('marketer-001')}
                        className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs hover:bg-zinc-50 flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium text-ink">أحمد عادل (مسوق رئيسي)</span>
                        <span className="text-[10px] text-ink-muted num-tabular">2,450 ج.م</span>
                      </button>

                      <button
                        onClick={() => loginAsDemoMarketer('marketer-002')}
                        className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs hover:bg-zinc-50 flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium text-ink">سارة محمود (مسوقة محتوى)</span>
                        <span className="text-[10px] text-ink-muted num-tabular">1,680 ج.م</span>
                      </button>

                      <button
                        onClick={loginAsDemoAdmin}
                        className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs hover:bg-zinc-50 flex items-center justify-between transition-colors text-ink font-semibold"
                      >
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck size={13} strokeWidth={1.6} className="text-zinc-700" />
                          <span>المدير العام (Master Admin)</span>
                        </span>
                        <span className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-mono">لوحة الإدارة</span>
                      </button>
                    </div>

                    <div className="border-t border-border mt-1 pt-1 px-1.5">
                      <button
                        onClick={logout}
                        className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium"
                      >
                        <LogOut size={13} strokeWidth={1.6} />
                        <span>{locale === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-around border-t border-border bg-white px-2 py-2 text-xs">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 py-1 px-2 rounded-md font-medium text-xs transition-colors ${
                  item.active ? 'text-ink font-bold bg-zinc-100' : 'text-ink-muted'
                }`}
              >
                <Icon size={14} strokeWidth={1.6} />
                <span>{locale === 'ar' ? item.label_ar : item.label_en}</span>
              </Link>
            );
          })}
        </div>
      </header>
    </>
  );
}
