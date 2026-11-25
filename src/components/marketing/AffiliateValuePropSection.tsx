'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Share2,
  Wallet,
  Calculator,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
  Smartphone,
  CreditCard,
  Building,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';

interface AffiliateValuePropSectionProps {
  showJoinLink?: boolean;
}

export default function AffiliateValuePropSection({
  showJoinLink = true,
}: AffiliateValuePropSectionProps) {
  const { locale } = useLanguage();
  const { settings, currencySymbol } = useSettings();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const minWithdrawal = settings.minWithdrawalAmount || 200;
  const returnWindowDays = settings.returnWindowDays ?? 7;

  const faqs =
    locale === 'ar'
      ? [
          {
            q: 'هل أحتاج رأس مال أو شراء بضاعة مسبقاً للعمل كمسوق؟',
            a: 'لا نهائياً. تسجيلك مجاني 100%؛ نحن نتحمل التكلفة والمخزون والتغليف والشحن والتحصيل من العميل، وأنت تركز فقط على التسويق وجلب الطلبات.',
          },
          {
            q: `لماذا تُحجز العمولة لمدة ${returnWindowDays} أيام بعد تسليم الطلب؟`,
            a: `في تجارة الملابس نمنح العميل حق الاستبدال والاسترجاع لمدة ${returnWindowDays} أيام لضمان ثقته. خلال هذه المدة تبقى عمولتك محفوظة في "الرصيد المحجوز" وتنتقل تلقائياً إلى "الرصيد المتاح للسحب" فور انتهاء المدة.`,
          },
          {
            q: 'ماذا يحدث إذا طلب العميل 3 قطع واسترجع قطعة واحدة فقط؟',
            a: 'نظام المرتجع الجزئي الذكي يحفظ لك كامل عمولتك عن القطعتين اللتين احتفظ بهما العميل، ويُخصم فقط نصيب القطعة المرتجعة بدقة وتُعاد تلقائياً للمخزون.',
          },
          {
            q: 'كم مدة صلاحية رابط الإحالة الخاص بي؟',
            a: 'عند زيارة أي عميل لرابطك المختصر (/r/كودك) يُسجَّل كوكي تتبع رسمي لمدة 30 يوماً متواصلة، وأي طلب يقوم به العميل خلال الـ 30 يوماً يُنسب لك تلقائياً.',
          },
          {
            q: 'ما هو الحد الأدنى للسحب وطرق استلام الأرباح؟',
            a: `الحد الأدنى لطلب السحب حالياً هو ${minWithdrawal} ${currencySymbol}، ويمكنك السحب عبر فودافون كاش أو إنستاباي (InstaPay) أو تحويل بنكي خلال 24 ساعة برقم مرجع موثّق.`,
          },
        ]
      : [
          {
            q: 'Do I need upfront capital or inventory to start?',
            a: 'No capital required. We hold inventory, pack, ship nationwide across Egypt, and collect COD while you focus purely on marketing.',
          },
          {
            q: `Why are commissions locked for ${returnWindowDays} days after delivery?`,
            a: `Apparel orders include a ${returnWindowDays}-day return/exchange window. Your profit moves to Locked Balance upon delivery and releases automatically to your withdrawable wallet once the window ends.`,
          },
          {
            q: 'What happens on a partial clothing return (e.g., 1 of 3 hoodies)?',
            a: 'Only the single returned unit commission is reversed and restocked — you keep 100% of your profit on the remaining kept items.',
          },
          {
            q: 'How long does referral link tracking last?',
            a: 'Every visit through your short link (/r/YOUR_CODE) sets a verified 30-day server-side attribution cookie with click and conversion analytics.',
          },
          {
            q: 'What is the minimum withdrawal amount and payout speed?',
            a: `Minimum payout is currently ${minWithdrawal} ${currencySymbol} via Vodafone Cash, InstaPay, or Bank Transfer within 24 hours.`,
          },
        ];

  return (
    <section id="affiliate-program" className="mt-10 space-y-8">
      {/* Section Header */}
      <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-5">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full mb-2">
              <ShieldCheck size={12} />
              <span>
                {locale === 'ar'
                  ? 'شبكة أفلييت الملابس الاحترافية — Ctrl YZ'
                  : 'Ctrl YZ Apparel Affiliate Network'}
              </span>
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-ink">
              {locale === 'ar'
                ? 'كيف تربح من تسويق ملابس Ctrl YZ في 3 خطوات واضحة'
                : 'Earn from Ctrl YZ Apparel in 3 Clear Steps'}
            </h2>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              {locale === 'ar'
                ? 'نظام أفلييت شفاف مصمم لسوق الملابس المصري: مخزون حقيقي بالمقاسات، معاينة قبل الدفع، تتبع 30 يوماً، وسحب سريع.'
                : 'Transparent apparel affiliate network built for Egypt: real variant stock, inspect-on-delivery COD, 30-day cookies, and fast payouts.'}
            </p>
          </div>

          {showJoinLink && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/login"
                className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>{locale === 'ar' ? 'ابدأ التسجيل مجاناً' : 'Join Free Now'}</span>
                <ArrowRight size={13} className={locale === 'ar' ? 'rotate-180' : ''} />
              </Link>
              <Link
                href="/join"
                className="px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-ink text-xs font-semibold transition-colors"
              >
                {locale === 'ar' ? 'التفاصيل الكاملة' : 'Full Program'}
              </Link>
            </div>
          )}
        </div>

        {/* 1. How It Works (3 Steps) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-ink text-white flex items-center justify-center">
                <UserCheck size={18} strokeWidth={1.6} />
              </div>
              <span className="font-mono text-xs font-bold text-neutral-400">01</span>
            </div>
            <h3 className="text-sm font-bold text-ink">
              {locale === 'ar' ? 'سجّل حسابك ووثّقه' : 'Sign Up & Verify'}
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              {locale === 'ar'
                ? 'سجّل الدخول بحساب Google، أدخل بياناتك ووسيلة السحب، وفعّل رقمك بكود التحقق ليتم اعتماد حسابك وتوليد كود الإحالة الخاص بك.'
                : 'Sign in with Google, complete your payout profile, verify via OTP, and get your verified affiliate code.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center">
                <Share2 size={18} strokeWidth={1.6} />
              </div>
              <span className="font-mono text-xs font-bold text-neutral-400">02</span>
            </div>
            <h3 className="text-sm font-bold text-ink">
              {locale === 'ar' ? 'شارك رابطك أو اطلب لعميلك' : 'Share Link or Place Direct Orders'}
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              {locale === 'ar'
                ? 'انشر رابطك المختصر (تتبع 30 يوماً) أو سجّل طلبات عملاء واتساب وفيسبوك مباشرة من لوحتك بالسعر الذي تختاره.'
                : 'Share your 30-day tracked link or enter WhatsApp/Facebook customer orders directly with your custom margin.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <Wallet size={18} strokeWidth={1.6} />
              </div>
              <span className="font-mono text-xs font-bold text-neutral-400">03</span>
            </div>
            <h3 className="text-sm font-bold text-ink">
              {locale === 'ar' ? 'اسحب أرباحك بسهولة' : 'Withdraw Earnings Fast'}
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              {locale === 'ar'
                ? `بعد التسليم وانتهاء فترة الاسترجاع (${returnWindowDays} أيام)، اسحب أرباحك بدءاً من ${minWithdrawal} ${currencySymbol} على محفظتك أو حسابك البنكي.`
                : `After delivery & the ${returnWindowDays}-day return window, withdraw from ${minWithdrawal} ${currencySymbol} directly to your wallet or bank.`}
            </p>
          </div>
        </div>

        {/* 2. Real Commission Example + Return Window Policy + Payout Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
          {/* Real Apparel Commission Math */}
          <div className="p-5 rounded-xl bg-[#09090B] text-white border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#38BDF8]">
              <Calculator size={15} />
              <span>{locale === 'ar' ? 'مثال عمولة حقيقي على الهودي' : 'Real Hoodie Commission Example'}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">{locale === 'ar' ? 'سعر الجملة للمسوق:' : 'Wholesale Cost:'}</span>
                <span className="font-mono font-semibold num-tabular">370 {currencySymbol}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">{locale === 'ar' ? 'سعر البيع المقترح للعميل:' : 'Suggested Selling Price:'}</span>
                <span className="font-mono font-semibold num-tabular">590 {currencySymbol}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-emerald-400 font-bold">{locale === 'ar' ? 'صافي ربحك على القطعة:' : 'Your Net Profit / Unit:'}</span>
                <span className="font-mono text-base font-bold text-emerald-400 num-tabular">
                  +220 {currencySymbol}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed pt-1 border-t border-zinc-800">
              {locale === 'ar'
                ? `بيع 25 قطعة فقط شهرياً = 5,500 ${currencySymbol} صافي ربح بدون تخزين أو شحن (ويمكنك البيع حتى 630 ${currencySymbol} لربح +260 ${currencySymbol} للقطعة).`
                : `Just 25 hoodies/month = 5,500 ${currencySymbol} net profit with zero inventory risk.`}
            </p>
          </div>

          {/* Apparel Return Window Transparency */}
          <div className="p-5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <RotateCcw size={15} />
              <span>
                {locale === 'ar'
                  ? `سياسة المرتجعات وفترة القفل (${returnWindowDays} أيام)`
                  : `Apparel Return Window (${returnWindowDays} Days)`}
              </span>
            </div>

            <ul className="space-y-2 text-xs text-amber-950/85 leading-relaxed">
              <li className="flex items-start gap-2">
                <Lock size={13} className="text-amber-700 mt-0.5 flex-shrink-0" />
                <span>
                  {locale === 'ar'
                    ? `تنتقل العمولة عند التسليم إلى "الرصيد المحجوز" لمدة ${returnWindowDays} أيام فقط لحماية حق العميل في الاستبدال.`
                    : `Delivered commissions stay in Locked Balance for ${returnWindowDays} days to cover garment exchanges.`}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-700 mt-0.5 flex-shrink-0" />
                <span>
                  {locale === 'ar'
                    ? 'دعم المرتجع الجزئي العادل: في حال إرجاع قطعة واحدة من طلب متعدد القطع، تحتفظ بكامل عمولة القطع المتبقية.'
                    : 'Fair partial returns: if 1 of 3 items is returned, you keep full commission on the remaining 2 items.'}
                </span>
              </li>
            </ul>
          </div>

          {/* Payout Terms & Methods */}
          <div className="p-5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <Wallet size={15} />
              <span>{locale === 'ar' ? 'شروط وطرق سحب الأرباح' : 'Payout Threshold & Methods'}</span>
            </div>

            <div className="p-3 rounded-lg bg-white border border-emerald-200 flex items-center justify-between text-xs">
              <span className="text-neutral-600">{locale === 'ar' ? 'الحد الأدنى للسحب:' : 'Minimum Payout:'}</span>
              <span className="font-mono font-bold text-emerald-700 text-sm num-tabular">
                {minWithdrawal} {currencySymbol}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[11px] text-center font-medium text-neutral-700">
              <div className="p-2 rounded-lg bg-white border border-border flex flex-col items-center gap-1">
                <Smartphone size={14} className="text-ink" />
                <span>{locale === 'ar' ? 'فودافون كاش' : 'Vodafone'}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-border flex flex-col items-center gap-1">
                <CreditCard size={14} className="text-ink" />
                <span>InstaPay</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-border flex flex-col items-center gap-1">
                <Building size={14} className="text-ink" />
                <span>{locale === 'ar' ? 'تحويل بنكي' : 'Bank'}</span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-900/80">
              {locale === 'ar'
                ? 'التحويل خلال 24 ساعة عمل مع إيصال مرجعي لكل معاملة داخل المحفظة.'
                : 'Processed within 24 hours with a verified transfer receipt in your wallet.'}
            </p>
          </div>
        </div>

        {/* 3. Collapsible FAQ */}
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-bold text-ink mb-3">
            {locale === 'ar' ? 'الأسئلة الشائعة للمسوقين الجدد' : 'Frequently Asked Questions'}
          </h3>
          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-neutral-50/70 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-4 py-3 text-right flex items-center justify-between gap-3 text-xs font-bold text-ink hover:bg-neutral-100/70 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={15}
                      className={`text-neutral-500 flex-shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3.5 text-xs text-ink-muted leading-relaxed border-t border-border/60 pt-2.5 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
