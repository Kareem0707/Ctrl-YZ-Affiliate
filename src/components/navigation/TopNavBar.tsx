'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/contexts/SettingsContext';

export default function TopNavBar() {
  const pathname = usePathname();
  const { user, isAdmin, isMarketer, isActiveMarketer, currentMarketer, logout } = useAuth();
  const { locale, toggleLanguage } = useLanguage();
  const { cartCount } = useCart();
  const { settings } = useSettings();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const whatsappDigits = (settings.contactWhatsApp || '').replace(/[^\d]/g, '');
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null;
  const announcementText =
    locale === 'ar'
      ? settings.announcement
      : settings.announcementEn || settings.announcement;

  const navLinks = [
    {
      href: '/',
      label_ar: 'المتجر',
      label_en: 'Store',
      icon: ShoppingBag,
      active: pathname === '/',
    },
    {
      href: isActiveMarketer || isAdmin ? '/affiliate' : currentMarketer ? '/affiliate/status' : '/login',
      label_ar: 'بوابة المسوقين',
      label_en: 'Affiliate Portal',
      icon: TrendingUp,
      active: pathname.startsWith('/affiliate'),
      badge: 'أرباح',
    },
    ...(user?.role === 'ADMIN' && isAdmin
      ? [
          {
            href: '/admin',
            label_ar: 'لوحة الإدارة',
            label_en: 'Admin Cockpit',
            icon: ShieldCheck,
            active: pathname.startsWith('/admin'),
          },
        ]
      : []),
    {
      href: '/track-order',
      label_ar: 'تتبع الشحنة',
      label_en: 'Track Shipment',
      icon: Truck,
      active: pathname === '/track-order',
    },
  ];

  return (
    <>
      {/* Editorial Announcement Strip */}
      <div className="bg-[#030303] text-white text-[12px] py-1.5 px-4 font-normal tracking-normal border-b border-zinc-800">
        <div className="max-w-[1536px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-brand shadow-[0_0_8px_#0258ED] animate-pulse flex-shrink-0" />
            <span className="text-zinc-300 truncate">{announcementText}</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                <MessageCircle size={12} />
                <span>{locale === 'ar' ? 'دعم واتساب' : 'WhatsApp Support'}</span>
              </a>
            )}
            <Link
              href={isActiveMarketer ? '/affiliate' : '/join'}
              className="inline-flex items-center gap-1 text-[#38BDF8] hover:text-white underline underline-offset-4 font-medium transition-colors"
            >
              <span>{locale === 'ar' ? 'ابدأ الربح كمسوق' : 'Earn as Affiliate'}</span>
              <ArrowRight size={12} className={locale === 'ar' ? 'rotate-180' : ''} />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Global Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-subtle">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex items-center justify-between h-14">
            {/* Brand Logo & Authority Label (Right in RTL) */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="flex items-center py-1">
                  <Image
                    src="/ctrl-logo-light.png"
                    alt={settings.storeName || 'Ctrl YZ'}
                    width={140}
                    height={32}
                    priority
                    className="h-7 sm:h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
                  />
                </div>
                <div className="hidden sm:flex flex-col border-r border-border pr-3">
                  <span className="text-[10px] font-bold text-brand tracking-widest uppercase leading-none">
                    {settings.storeName || 'Ctrl YZ'}
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

            {/* Controls: Compact Language Switcher + Cart + Demo Account Pill */}
            <div className="flex items-center gap-2">
              {/* Desktop Cart Button */}
              <Link
                href="/"
                onClick={(e) => {
                  // If on storefront, trigger tab switch or open cart
                  if (pathname === '/') {
                    window.dispatchEvent(new CustomEvent('ctrl_open_cart'));
                  }
                }}
                className="relative hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-ink hover:bg-neutral-100 border border-border transition-colors"
                title={locale === 'ar' ? 'سلة التسوق' : 'Shopping Cart'}
              >
                <ShoppingBag size={14} strokeWidth={1.6} />
                <span className="hidden md:inline">{locale === 'ar' ? 'السلة' : 'Cart'}</span>
                {cartCount > 0 && (
                  <span className="bg-brand text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center num-tabular">
                    {cartCount}
                  </span>
                )}
              </Link>

              <button
                onClick={toggleLanguage}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-ink-muted hover:text-ink hover:bg-zinc-100 border border-transparent transition-colors flex items-center gap-1"
                title={locale === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
              >
                <Globe size={13} strokeWidth={1.6} />
                <span className="num-tabular uppercase">{locale === 'ar' ? 'EN' : 'عربي'}</span>
              </button>

              <div className="h-4 w-px bg-border" />

              {/* User Profile / Login Button */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-border text-ink text-xs font-medium transition-all group"
                  >
                    {user.photoURL || currentMarketer?.avatar ? (
                      <Image
                        src={user.photoURL || currentMarketer?.avatar || ''}
                        alt={user.displayName || 'User'}
                        width={28}
                        height={28}
                        unoptimized
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-brand/40 shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : (isAdmin ? 'A' : 'M')}
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="text-xs font-bold leading-tight text-ink group-hover:text-brand transition-colors">
                        {user.displayName?.split(' ')[0] || (isAdmin ? 'الإدارة' : 'المسوق')}
                      </span>
                      <span className="text-[10px] text-ink-muted leading-tight font-mono">
                        {isAdmin
                          ? 'مدير المنصة'
                          : isActiveMarketer
                          ? currentMarketer?.affiliateCode || 'مسوق معتمد'
                          : currentMarketer
                          ? 'قيد المراجعة'
                          : 'حساب Google'}
                      </span>
                    </div>
                    <ChevronDown size={12} strokeWidth={1.6} className="text-ink-muted" />
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="absolute left-0 sm:left-auto right-0 mt-2 w-64 bg-white rounded-2xl shadow-elevated border border-border py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      {/* User Header */}
                      <div className="px-3.5 py-2.5 border-b border-border flex items-center gap-3">
                        {user.photoURL || currentMarketer?.avatar ? (
                          <Image
                            src={user.photoURL || currentMarketer?.avatar || ''}
                            alt={user.displayName || 'User'}
                            width={40}
                            height={40}
                            unoptimized
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-brand/40 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : (isAdmin ? 'A' : 'M')}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-ink truncate">
                            {user.displayName || 'مستخدم مسجل'}
                          </p>
                          <p className="text-[10px] text-ink-muted truncate font-mono">
                            {user.email || 'حساب مفعل'}
                          </p>
                          <span className="inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.2 rounded bg-brand/10 text-brand">
                            {isAdmin
                              ? 'مدير المنصة'
                              : isActiveMarketer
                              ? 'مسوق معتمد'
                              : currentMarketer
                              ? 'طلب انضمام قيد التفعيل'
                              : 'مستخدم مسجل'}
                          </span>
                        </div>
                      </div>

                      {/* Wallet Balance for Marketers */}
                      {isMarketer && currentMarketer && (
                        <div className="mx-3 my-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                          <span className="flex items-center gap-1 font-medium text-[11px]">
                            <Wallet size={12} strokeWidth={1.6} className="text-emerald-700" />
                            {locale === 'ar' ? 'المتاح للسحب:' : 'Available:'}
                          </span>
                          <span className="font-bold font-mono text-emerald-800 num-tabular">
                            {currentMarketer.walletBalance} ج.م
                          </span>
                        </div>
                      )}

                      {/* Quick Navigation Links */}
                      <div className="px-1.5 py-1 space-y-0.5">
                        {isAdmin ? (
                          <Link
                            href="/admin"
                            className="w-full text-right px-3 py-2 rounded-lg text-xs hover:bg-neutral-50 flex items-center gap-2 text-ink font-medium transition-colors"
                          >
                            <ShieldCheck size={14} className="text-brand" />
                            <span>لوحة إدارة العمليات المركزية</span>
                          </Link>
                        ) : (
                          <Link
                            href={isActiveMarketer ? '/affiliate' : currentMarketer ? '/affiliate/status' : '/login?step=onboarding'}
                            className="w-full text-right px-3 py-2 rounded-lg text-xs hover:bg-neutral-50 flex items-center gap-2 text-ink font-medium transition-colors"
                          >
                            <TrendingUp size={14} className="text-emerald-600" />
                            <span>
                              {isActiveMarketer
                                ? 'بوابة المسوقين والأرباح'
                                : currentMarketer
                                ? 'متابعة حالة طلب المسوق'
                                : 'استكمال التسجيل كمسوق'}
                            </span>
                          </Link>
                        )}
                      </div>

                      {/* Logout Action */}
                      <div className="border-t border-border mt-1 pt-1 px-1.5">
                        <button
                          onClick={logout}
                          className="w-full text-right px-3 py-2 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-semibold"
                        >
                          <LogOut size={13} strokeWidth={1.8} />
                          <span>{locale === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-subtle transition-all active:scale-95"
                >
                  <User size={13} strokeWidth={2} />
                  <span>{locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
                </Link>
              )}
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
