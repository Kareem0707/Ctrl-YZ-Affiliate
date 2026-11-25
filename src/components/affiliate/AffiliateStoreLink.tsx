'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Link2,
  Copy,
  Check,
  Share2,
  Target,
  MousePointerClick,
  TrendingUp,
  ShoppingBag,
  QrCode,
  Download,
  X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Marketer } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface AffiliateStoreLinkProps {
  marketer: Marketer;
}

export default function AffiliateStoreLink({ marketer }: AffiliateStoreLinkProps) {
  const { locale } = useLanguage();
  const [copiedTarget, setCopiedTarget] = useState<'short' | 'query' | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const qrWrapperRef = useRef<HTMLDivElement | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>(
    (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const encodedCode = encodeURIComponent(marketer.affiliateCode);
  const resolvedOrigin = baseUrl || 'https://ctrl-yz-affiliate.vercel.app';
  const shortAffiliateUrl = `${resolvedOrigin}/r/${encodedCode}`;
  const queryAffiliateUrl = `${resolvedOrigin}/?ref=${encodedCode}`;

  const clicksCount = marketer.clicksCount ?? 0;
  const ordersCount = marketer.ordersCount ?? 0;
  const conversionRate =
    marketer.conversionRate !== undefined
      ? marketer.conversionRate
      : clicksCount > 0
      ? Math.round((ordersCount / clicksCount) * 1000) / 10
      : 0;

  const handleCopy = (url: string, target: 'short' | 'query') => {
    navigator.clipboard.writeText(url);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 2500);
  };

  const handleDownloadQrPng = () => {
    const canvas = qrWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `ctrl-yz-${marketer.affiliateCode}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-5">
      {/* Referral Link Main Card */}
      <div className="bg-ink text-white p-6 sm:p-7 rounded-xl border border-neutral-800 relative">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-md border border-neutral-700">
            <Link2 size={12} strokeWidth={1.6} />
            <span>
              {locale === 'ar'
                ? 'رابط الإحالة والمتجر الترويجي المباشر (تتبع 30 يوماً)'
                : 'Personal Affiliate Store Link (30-Day Cookie)'}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight mb-2">
              {locale === 'ar'
                ? 'شارك رابطك الخاص واكسب عمولتك تلقائياً عن كل طلب'
                : 'Share your personal store link & earn on auto-pilot'}
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {locale === 'ar'
                ? 'عند زيارة العميل لرابطك يُسجل كوكي تتبع رسمي على الخادم لمدة 30 يوماً متواصلة، مع تسجيل النقرات الحقيقية ومعدل التحويل في لوحتك.'
                : 'Visitors clicking your link receive a verified 30-day server-side attribution cookie with deduplicated click & conversion analytics.'}
            </p>
          </div>

          {/* Primary Short Link Copy Box (/r/[code]) */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-neutral-400 block">
              {locale === 'ar' ? 'الرابط المختصر الرسمي (موصى به للإعلانات):' : 'Short Referral Link (Recommended):'}
            </span>
            <div className="bg-neutral-900 p-2 rounded-lg border border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div
                dir="ltr"
                className="flex-1 px-3 py-1.5 font-mono text-xs text-neutral-200 truncate select-all num-tabular text-left"
              >
                {shortAffiliateUrl}
              </div>
              <button
                onClick={() => handleCopy(shortAffiliateUrl, 'short')}
                className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  copiedTarget === 'short'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-ink hover:bg-neutral-100'
                }`}
              >
                {copiedTarget === 'short' ? (
                  <>
                    <Check size={14} strokeWidth={1.6} />
                    <span>{locale === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} strokeWidth={1.6} />
                    <span>{locale === 'ar' ? 'نسخ الرابط المختصر' : 'Copy Short Link'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Storefront Query Link (/?ref=...) */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-neutral-400 block">
              {locale === 'ar' ? 'رابط المتجر المباشر (Query Ref):' : 'Direct Storefront Link:'}
            </span>
            <div className="bg-neutral-900/70 p-2 rounded-lg border border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div
                dir="ltr"
                className="flex-1 px-3 py-1 font-mono text-[11px] text-neutral-300 truncate select-all num-tabular text-left"
              >
                {queryAffiliateUrl}
              </div>
              <button
                onClick={() => handleCopy(queryAffiliateUrl, 'query')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border ${
                  copiedTarget === 'query'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
                }`}
              >
                {copiedTarget === 'query' ? (
                  <>
                    <Check size={13} strokeWidth={1.6} />
                    <span>{locale === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} strokeWidth={1.6} />
                    <span>{locale === 'ar' ? 'نسخ' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real Funnel Analytics (Clicks, Orders, Conversion Rate) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-brand flex items-center justify-center flex-shrink-0">
            <MousePointerClick size={18} strokeWidth={1.6} />
          </div>
          <div>
            <span className="text-[11px] text-neutral-500 block font-medium">
              {locale === 'ar' ? 'إجمالي النقرات الموثّقة' : 'Verified Clicks'}
            </span>
            <span className="text-xl font-bold font-mono text-ink num-tabular">
              {clicksCount.toLocaleString()}
            </span>
            <span className="block text-[10px] text-neutral-400">
              {locale === 'ar' ? 'مع تصفية التكرار كل 30 دقيقة' : '30-min deduplicated'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-ink flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={18} strokeWidth={1.6} />
          </div>
          <div>
            <span className="text-[11px] text-neutral-500 block font-medium">
              {locale === 'ar' ? 'إجمالي الطلبات المسجلة' : 'Attributed Orders'}
            </span>
            <span className="text-xl font-bold font-mono text-ink num-tabular">
              {ordersCount.toLocaleString()}
            </span>
            <span className="block text-[10px] text-neutral-400">
              {locale === 'ar' ? `تم تسليم ${marketer.deliveredCount} طلب` : `${marketer.deliveredCount} delivered`}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} strokeWidth={1.6} />
          </div>
          <div>
            <span className="text-[11px] text-neutral-500 block font-medium">
              {locale === 'ar' ? 'معدل التحويل (Orders / Clicks)' : 'Conversion Rate'}
            </span>
            <span className="text-xl font-bold font-mono text-emerald-700 num-tabular">
              {conversionRate}%
            </span>
            <span className="block text-[10px] text-neutral-400">
              {locale === 'ar' ? 'تحليلات القمع الحقيقية' : 'Live funnel analytics'}
            </span>
          </div>
        </div>
      </div>

      {/* Marketer Promo Code, Cookie & Scannable QR Badges */}
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
            <span className="text-[11px] text-neutral-400 block font-medium">صلاحية كوكي التتبع الرسمي (ctrl_ref):</span>
            <span className="text-sm font-bold text-ink">30 يوماً متواصلة (Server HttpOnly)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setQrModalOpen(true)}
          className="bg-white p-5 rounded-xl border border-border hover:border-brand/50 transition-colors flex items-center gap-3.5 text-right group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-brand flex items-center justify-center flex-shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
            <QrCode size={18} strokeWidth={1.6} />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 block font-medium">رمز QR قابل للمسح والطباعة:</span>
            <span className="text-xs font-bold text-brand group-hover:underline">
              {locale === 'ar' ? 'عرض وتحميل رمز QR (PNG)' : 'View & Download QR (PNG)'}
            </span>
          </div>
        </button>
      </div>

      {/* Scannable QR Code Modal */}
      {qrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs"
          onClick={() => setQrModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-border shadow-xl max-w-sm w-full p-6 text-center relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
              className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="text-base font-bold text-ink">
                {locale === 'ar' ? 'رمز QR لرابط متجرك الشخصي' : 'Your Affiliate Store QR Code'}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {locale === 'ar'
                  ? 'يمكنك طباعته أو مشاركته في الستوري والبوستات لتوجيه العملاء مباشرة لرابطك'
                  : 'Print or share in stories and posts to send shoppers straight to your tracked link'}
              </p>
            </div>

            <div
              ref={qrWrapperRef}
              className="inline-flex items-center justify-center p-4 bg-white rounded-xl border-2 border-neutral-200 shadow-xs"
            >
              <QRCodeCanvas
                value={shortAffiliateUrl}
                size={210}
                bgColor="#ffffff"
                fgColor="#09090b"
                level="H"
                includeMargin
              />
            </div>

            <div className="bg-neutral-50 border border-border rounded-lg p-2.5 text-[11px] font-mono text-neutral-600 truncate" dir="ltr">
              {shortAffiliateUrl}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="flex-1 py-2.5 px-4 rounded-xl bg-ink hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={14} />
                <span>{locale === 'ar' ? 'تحميل PNG' : 'Download PNG'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(shortAffiliateUrl, 'short')}
                className="py-2.5 px-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-ink text-xs font-semibold transition-colors"
              >
                {copiedTarget === 'short' ? 'تم النسخ ✓' : 'نسخ الرابط'}
              </button>
            </div>
          </div>
        </div>
      )}

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
