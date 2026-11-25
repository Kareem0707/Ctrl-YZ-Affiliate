'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Sparkles,
  BookOpen,
  Link2,
  Download,
  ShoppingBag,
  TrendingUp,
  Wallet,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Truck,
  Eye,
  MessageCircle,
} from 'lucide-react';
import type { Marketer } from '@/lib/types';
import { useSettings } from '@/contexts/SettingsContext';

interface MarketerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketer?: Marketer | null;
}

export default function MarketerGuideModal({ isOpen, onClose, marketer }: MarketerGuideModalProps) {
  const { settings, currencySymbol } = useSettings();
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'orders' | 'payouts'>('overview');
  const [siteOrigin, setSiteOrigin] = useState<string>(
    (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setSiteOrigin(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const encodedCode = encodeURIComponent(marketer?.affiliateCode || 'YOUR_CODE');
  const referralExampleUrl = `${siteOrigin || 'https://ctrl-yz-affiliate.vercel.app'}/r/${encodedCode}`;
  const returnWindowDays = settings.returnWindowDays ?? 7;
  const minWithdrawal = settings.minWithdrawalAmount || 200;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div
        dir="rtl"
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl p-6 sm:p-8 space-y-6"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <BookOpen size={20} strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  تم استلام طلبك بنجاح ✓
                </span>
                <span className="text-[11px] text-ink-muted">قيد المراجعة الإدارية</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-ink mt-1">
                دليل المسوق الشامل — كيف تبدأ وتكسب في Ctrl YZ
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Personalized Welcoming Card */}
        <div className="p-4 rounded-xl bg-[#030303] text-white border border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 bg-brand/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-zinc-400">
                مرحباً بك يا <strong className="text-white font-bold">{marketer?.name || 'شريك النجاح'}</strong>!
              </p>
              <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
                كود الإحالة الترويجي المبدئي الخاص بك: <span className="text-[#38BDF8] font-mono tracking-wider">{marketer?.affiliateCode || 'YZ-PROMO'}</span>
              </h4>
              <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                طلبك الآن على مكتب فريق الإدارة للاعتماد النهائي. يمكنك استغلال هذا الوقت لفهم آلية البيع وتحميل الميديا الإعلانية لكامبين الشتاء.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs for Guide */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'overview' ? 'bg-white text-ink shadow-xs font-bold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'links' ? 'bg-white text-ink shadow-xs font-bold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            روابط الإحالة
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'orders' ? 'bg-white text-ink shadow-xs font-bold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            الطلبات والشحن
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'payouts' ? 'bg-white text-ink shadow-xs font-bold' : 'text-ink-muted hover:text-ink'
            }`}
          >
            سحب الأرباح
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-3 text-xs leading-relaxed text-ink-muted">
            <div className="p-4 rounded-xl bg-neutral-50 border border-border flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-brand flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <h5 className="font-bold text-ink text-sm mb-1">تسويق بدون رأس مال ولا مخاطرة</h5>
                <p>
                  نحن نوفر البضاعة والمخزون والتغليف الفاخر والشحن لكافة محافظات مصر. أنت تركز فقط على النشر وجلب العملاء عبر السوشيال ميديا.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-border flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-brand flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <h5 className="font-bold text-ink text-sm mb-1">عمولات مرتفعة وتنافسية</h5>
                <p>
                  تحصل على عمولة صافية تتراوح بين <strong>220 إلى 260 ج.م</strong> على كل قطعة هودي تباع من خلال كودك، وهي من أعلى نسب الربح المباشر في الشرق الأوسط.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-border flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-brand flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <h5 className="font-bold text-ink text-sm mb-1">ميزة المعاينة قبل الدفع (تضمن تسليم +88%)</h5>
                <p>
                  يحق للعميل فتح الطرد والتأكد من المقاس وجودة الخامة قبل سداد المبلغ للمندوب. هذه الميزة تمنح عميلك ثقة فورية وتخفض نسبة المرتجعات لأدنى حد!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LINKS & MARKETING */}
        {activeTab === 'links' && (
          <div className="space-y-4 text-xs leading-relaxed text-ink-muted">
            <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2">
              <h5 className="font-bold text-ink text-sm flex items-center gap-1.5">
                <Link2 size={16} className="text-brand" />
                <span>كيف يعمل رابط الإحالة؟</span>
              </h5>
              <p>
                أي رابط تشاركه مع عملائك يضاف إليه كودك:
                <code className="block mt-1 p-2 rounded-lg bg-white border border-border font-mono text-[11px] text-brand select-all" dir="ltr">
                  {referralExampleUrl}
                </code>
              </p>
              <p className="text-[11px]">
                بمجرد دخول العميل عبر هذا الرابط، يُحفظ كوكي تتبع رسمي لمدة 30 يوماً وتُسجل أي عملية شراء باسمك وتُضاف عمولتها لمحفظتك تلقائياً.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2">
              <h5 className="font-bold text-ink text-sm flex items-center gap-1.5">
                <Download size={16} className="text-brand" />
                <span>تحميل الميديا والنصوص الإعلانية</span>
              </h5>
              <p>
                في صفحة كل منتج في &quot;بوابة المسوقين&quot;، ستجد زراً لتحميل مجلد صور وفيديوهات إعلانية احترافية جاهزة بجودة عالية بدون علامة مائية، بالإضافة إلى نصوص إعلانية (Ad Copies) مقترحة للفيسبوك وتيك توك.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS & SHIPPING */}
        {activeTab === 'orders' && (
          <div className="space-y-3 text-xs leading-relaxed text-ink-muted">
            <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-1.5">
              <h5 className="font-bold text-ink text-sm flex items-center gap-1.5">
                <ShoppingBag size={16} className="text-brand" />
                <span>طريقتان لتسجيل طلبات العملاء</span>
              </h5>
              <p>
                <strong>1. العميل يطلب بنفسه:</strong> يفتح رابط متجرك، يختار المقاس ويملأ عنوانه ورقم هاتفه.
              </p>
              <p>
                <strong>2. أنت تسجل للعميل (Direct Entry):</strong> إذا تواصل معك العميل على واتساب أو ماسنجر، يمكنك الدخول إلى &quot;تسجيل طلب جديد&quot; في لوحتك وإدخال بياناته بضغطة زر.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-1.5">
              <h5 className="font-bold text-ink text-sm flex items-center gap-1.5">
                <Truck size={16} className="text-brand" />
                <span>الشحن والتأكيد</span>
              </h5>
              <p>
                يقوم فريق خدمة عملاء Ctrl YZ بالاتصال بالعميل لتأكيد تفاصيل العنوان والمقاس، ثم تسليم الشحنة لشركة الشحن خلال 24 ساعة.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: PAYOUTS */}
        {activeTab === 'payouts' && (
          <div className="space-y-3 text-xs leading-relaxed text-ink-muted">
            <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2">
              <h5 className="font-bold text-ink text-sm flex items-center gap-1.5">
                <Wallet size={16} className="text-emerald-600" />
                <span>مواعيد وسرعة سحب الأرباح</span>
              </h5>
              <p>
                بعد تسليم الشحنة للعميل بنجاح، تنتقل العمولة إلى <strong>&quot;الرصيد المحجوز لفترة الاسترجاع&quot;</strong> ({returnWindowDays} أيام)، ثم تتحرر تلقائياً إلى <strong>&quot;الرصيد المتاح للسحب&quot;</strong>.
              </p>
              <ul className="list-disc list-inside space-y-1 pr-2">
                <li>الحد الأدنى لطلب السحب حالياً هو <strong>{minWithdrawal} {currencySymbol}</strong>.</li>
                <li>يتم التحويل على فودافون كاش أو إنستاباي خلال 24 ساعة من تقديم الطلب.</li>
                <li>سجل كامل ومفصل لكل عملية تحويل مع رقم المعاملة للشفافية المطلقة.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer & Actions */}
        <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>طلبك محفوظ وسيتم تفعيله من الإدارة خلال دقائق</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-ink hover:bg-neutral-50 text-xs font-semibold transition text-center flex-1 sm:flex-none"
            >
              تصفح المتجر والمنتجات
            </Link>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-ink text-white text-xs font-bold hover:bg-neutral-800 transition text-center flex-1 sm:flex-none"
            >
              تم، جاهز للبدء ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
