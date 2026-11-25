'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import AffiliateValuePropSection from '@/components/marketing/AffiliateValuePropSection';

export default function JoinAffiliatePage() {
  const { locale, dir } = useLanguage();
  const { isActiveMarketer, currentMarketer } = useAuth();
  const { settings, currencySymbol } = useSettings();

  const ctaHref = isActiveMarketer
    ? '/affiliate'
    : currentMarketer
    ? '/affiliate/status'
    : '/login';

  return (
    <div dir={dir} className="min-h-screen bg-canvas pb-24">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 pt-6">
        {/* Focused Conversion Hero */}
        <section className="relative overflow-hidden rounded-2xl bg-[#030303] text-white border border-zinc-800 p-7 sm:p-10 lg:p-12 shadow-elevated">
          <div className="absolute top-0 left-0 w-96 h-96 bg-brand/25 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-[#38BDF8]">
              <Sparkles size={13} />
              <span>
                {locale === 'ar'
                  ? `برنامج المسوقين الرسمي — ${settings.storeName}`
                  : `Official Affiliate Program — ${settings.storeName}`}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
              {locale === 'ar'
                ? `ابدأ الربح من تسويق ملابس Ctrl YZ بعمولات تصل إلى 260 ${currencySymbol} للقطعة`
                : `Earn up to 260 ${currencySymbol} per hoodie promoting Ctrl YZ Streetwear`}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
              {locale === 'ar'
                ? 'منصة أفلييت ملابس حقيقية بدون رأس مال: نوفر لك الهوديز الأوفر سايز (قطن 420 GSM)، المعاينة قبل الدفع، الشحن لجميع المحافظات، وتتبع كوكيز لمدة 30 يوماً مع سحب سريع.'
                : 'Zero-capital apparel affiliate platform: heavyweight 420 GSM hoodies, inspect-before-paying COD, nationwide shipping, 30-day attribution cookies, and fast payouts.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={ctaHref}
                className="px-6 py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors shadow-md"
              >
                <span>
                  {isActiveMarketer
                    ? locale === 'ar'
                      ? 'الدخول إلى لوحة المسوق'
                      : 'Go to Affiliate Portal'
                    : locale === 'ar'
                    ? 'سجّل كمسوق الآن مجاناً'
                    : 'Join Free as an Affiliate'}
                </span>
                <ArrowRight size={15} className={locale === 'ar' ? 'rotate-180' : ''} />
              </Link>

              <Link
                href="/"
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <ShoppingBag size={15} />
                <span>{locale === 'ar' ? 'تصفح منتجات المتجر' : 'Browse Storefront'}</span>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-3 text-[11px] text-zinc-300">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                {locale === 'ar' ? 'تسجيل مجاني بدون رأس مال' : '100% Free to Join'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                {locale === 'ar' ? 'كوكي تتبع 30 يوماً' : '30-Day Cookie Tracking'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                {locale === 'ar'
                  ? `حد أدنى للسحب ${settings.minWithdrawalAmount} ${currencySymbol}`
                  : `Min Payout ${settings.minWithdrawalAmount} ${currencySymbol}`}
              </span>
            </div>
          </div>
        </section>

        {/* Full Affiliate Value Proposition & FAQ */}
        <AffiliateValuePropSection showJoinLink={false} />
      </div>
    </div>
  );
}
