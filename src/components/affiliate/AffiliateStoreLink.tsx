'use client';

import React, { useState } from 'react';
import {
  Link2,
  Copy,
  Check,
  Share2,
  QrCode,
  Target,
  ExternalLink,
} from 'lucide-react';
import type { Marketer } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface AffiliateStoreLinkProps {
  marketer: Marketer;
}

export default function AffiliateStoreLink({ marketer }: AffiliateStoreLinkProps) {
  const { locale } = useLanguage();
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ctrlyz.com';
  const affiliateUrl = `${baseUrl}/?ref=${marketer.affiliateCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Referral Link Main Card */}
      <div className="bg-ink text-white p-6 sm:p-7 rounded-xl border border-neutral-800 relative">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-md border border-neutral-700 mb-3">
            <Link2 size={12} strokeWidth={1.6} />
            <span>{locale === 'ar' ? 'رابط الإحالة والمتجر الترويجي المباشر' : 'Personal Affiliate Store Link'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold leading-tight mb-2">
            {locale === 'ar'
              ? 'شارك رابطك الخاص واكسب عمولتك تلقائياً عن كل طلب'
              : 'Share your personal store link & earn on auto-pilot'}
          </h2>

          <p className="text-xs text-neutral-400 leading-relaxed mb-5">
            {locale === 'ar'
              ? 'أي عميل يقوم بالشراء عبر رابطك يتم ربط طلبه تلقائياً بكودك الترويجي، وتودع عمولتك في محفظتك فور تسليم الشحنة وتحصيل قيمتها.'
              : 'Customers ordering through your unique link are automatically tagged with your referral code, crediting commission on delivery.'}
          </p>

          {/* Copy Box */}
          <div className="bg-neutral-900 p-2 rounded-lg border border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 px-3 py-1.5 font-mono text-xs text-neutral-200 truncate select-all num-tabular">
              {affiliateUrl}
            </div>
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-ink hover:bg-neutral-100'
              }`}
            >
              {copied ? (
                <>
                  <Check size={14} strokeWidth={1.6} />
                  <span>{locale === 'ar' ? 'تم نسخ الرابط' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy size={14} strokeWidth={1.6} />
                  <span>{locale === 'ar' ? 'نسخ الرابط' : 'Copy Link'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Marketer Promo Code Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0">
            <Target size={18} strokeWidth={1.6} />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block font-medium">كود الإحالة الترويجي:</span>
            <span className="text-base font-bold font-mono text-ink num-tabular">{marketer.affiliateCode}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0">
            <Share2 size={18} strokeWidth={1.6} />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block font-medium">صلاحية تتبع الكوكيز:</span>
            <span className="text-sm font-bold text-ink">30 يوماً متواصلة</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center flex-shrink-0">
            <QrCode size={18} strokeWidth={1.6} />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block font-medium">رمز QR للطباعة:</span>
            <span className="text-xs font-semibold text-brand cursor-pointer hover:underline">جاهز للمسح</span>
          </div>
        </div>
      </div>

      {/* Best Practices for Marketers */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-border space-y-3">
        <h3 className="text-sm font-bold text-ink pb-3 border-b border-border">
          {locale === 'ar' ? 'إرشادات التسويق وزيادة المبيعات' : 'Marketing Best Practices'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-neutral-50 border border-border space-y-1">
            <p className="font-semibold text-ink text-xs">
              1. حملات الإعلانات الممولة (Paid Ads)
            </p>
            <p className="text-neutral-500 leading-relaxed text-[11px]">
              حمل الفيديوهات بدون علامة مائية من زر &quot;نصوص الإعلانات&quot;، واصنع إعلانات مباشرة على تيك توك وفيسبوك مستفيداً من هوامش العمولات المرتفعة.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-50 border border-border space-y-1">
            <p className="font-semibold text-ink text-xs">
              2. المجموعات والمبيعات المباشرة (Direct Sales)
            </p>
            <p className="text-neutral-500 leading-relaxed text-[11px]">
              شارك صور وتفاصيل المنتجات في مجموعات وقنوات التواصل، وسجل طلبات عملائك من تبويب &quot;تسجيل طلب لعميل&quot; لنتولى الشحن والتحصيل نيابة عنك.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
