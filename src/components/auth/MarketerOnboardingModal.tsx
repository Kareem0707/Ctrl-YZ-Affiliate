'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  CreditCard,
  Building,
  Smartphone,
  Globe,
  Share2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { saveMarketer } from '@/lib/dataService';
import type { Marketer } from '@/lib/types';

interface MarketerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    name?: string;
    email?: string;
    uid?: string;
  };
  onSuccess: (marketer: Marketer) => void;
}

const EGYPT_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الدقهلية (المنصورة)',
  'القليوبية',
  'الشرقية (الزقازيق)',
  'الغربية (طنطا)',
  'المنوفية',
  'البحيرة',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'مطروح',
  'البحر الأحمر',
  'الوادي الجديد',
];

const MARKETING_CHANNELS = [
  'صفحة فيسبوك (Facebook Page)',
  'جروبات ومجموعات فيسبوك',
  'تيك توك (TikTok Shop / Ads)',
  'إنستغرام (Instagram Page)',
  'قناة تليجرام (Telegram)',
  'متجر إلكتروني أو موقع خاص',
  'حالات ومجموعات واتساب',
];

export default function MarketerOnboardingModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: MarketerOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [city, setCity] = useState(EGYPT_GOVERNORATES[0]);

  // Marketing Channels & Experience
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['صفحة فيسبوك (Facebook Page)']);
  const [channelLinks, setChannelLinks] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [expectedMonthlyOrders, setExpectedMonthlyOrders] = useState('20-50');

  // Payout Information
  const [payoutMethod, setPayoutMethod] = useState<'vodafone_cash' | 'instapay' | 'bank_transfer'>('vodafone_cash');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');

  if (!isOpen) return null;

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim()) {
        setError('يرجى كتابة الاسم الرباعي بالكامل.');
        return;
      }
      if (!phone.trim() || phone.trim().length < 10) {
        setError('يرجى كتابة رقم هاتف مصري صحيح (01xxxxxxxxx).');
        return;
      }
      if (nationalId.trim() && nationalId.trim().length !== 14) {
        setError('الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedChannels.length === 0) {
        setError('يرجى اختيار قناة تسويقية واحدة على الأقل.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!payoutAccount.trim()) {
      setError('يرجى إدخال رقم المحفظة أو حساب إنستاباي لاستلام العمولات.');
      return;
    }

    setLoading(true);
    try {
      const generatedCode = `YZ-${name.trim().split(' ')[0].toUpperCase().slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`;

      const newMarketer = await saveMarketer({
        uid: initialData?.uid || `user-${Date.now()}`,
        name: name.trim(),
        email: email.trim() || `${phone.trim()}@affiliate.com`,
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        nationalId: nationalId.trim(),
        city,
        marketingChannels: selectedChannels,
        channelLinks: channelLinks.trim(),
        experienceLevel,
        expectedMonthlyOrders,
        affiliateCode: generatedCode,
        status: 'pending',
        payoutInfo: {
          method: payoutMethod,
          accountNumber: payoutAccount.trim(),
          accountHolderName: accountHolderName.trim() || name.trim(),
          bankName: payoutMethod === 'bank_transfer' ? bankName.trim() : undefined,
        },
      });

      onSuccess(newMarketer);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ بيانات الانضمام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div
        dir="rtl"
        className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-border shadow-2xl p-6 sm:p-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_8px_#0258ED] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                برنامج مسوقي Ctrl YZ الرسمي
              </span>
            </div>
            <h2 className="text-xl font-bold text-ink tracking-tight">
              استكمال طلب انضمام مسوق جديد
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              خطوة واحدة للانضمام: نتحقق من بيانات المسوقين لضمان حماية العمولات وحقوق الملكية
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-3 gap-2">
          <div
            className={`p-2.5 rounded-xl border text-center transition-all ${
              step >= 1
                ? 'bg-blue-50 border-brand text-brand font-bold shadow-xs'
                : 'bg-neutral-50 border-border text-ink-muted'
            }`}
          >
            <span className="text-[11px] block">الخطوة 1</span>
            <span className="text-xs">البيانات الشخصية</span>
          </div>
          <div
            className={`p-2.5 rounded-xl border text-center transition-all ${
              step >= 2
                ? 'bg-blue-50 border-brand text-brand font-bold shadow-xs'
                : 'bg-neutral-50 border-border text-ink-muted'
            }`}
          >
            <span className="text-[11px] block">الخطوة 2</span>
            <span className="text-xs">قنوات التسويق</span>
          </div>
          <div
            className={`p-2.5 rounded-xl border text-center transition-all ${
              step === 3
                ? 'bg-blue-50 border-brand text-brand font-bold shadow-xs'
                : 'bg-neutral-50 border-border text-ink-muted'
            }`}
          >
            <span className="text-[11px] block">الخطوة 3</span>
            <span className="text-xs">بيانات الأرباح</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Personal & Contact Information */}
        {step === 1 && (
          <div className="space-y-4 text-xs font-semibold text-neutral-700">
            <div>
              <label className="block mb-1 text-ink">
                الاسم الرباعي الكامل (المطابق للبطاقة) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أحمد محمد السيد عادل"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-ink">
                  رقم الهاتف (الأساسي) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block mb-1 text-ink">
                  رقم الواتساب (للإشعارات الفورية)
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="اتركه فارغاً إذا كان نفس الرقم"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-ink">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marketer@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-ink">
                  الرقم القومي (14 رقماً للتحقق المالي)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                  placeholder="298xxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block mb-1 text-ink">المحافظة / المدينة</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink bg-white focus:outline-none focus:border-brand"
                >
                  {EGYPT_GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3 bg-ink hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                المتابعة إلى قنوات التسويق والخبرة &larr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Marketing Channels & Experience */}
        {step === 2 && (
          <div className="space-y-4 text-xs font-semibold text-neutral-700">
            <div>
              <label className="block mb-2 text-ink">
                أين تنوي تسويق منتجات Ctrl YZ؟ (اختر كل ما ينطبق) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MARKETING_CHANNELS.map((ch) => {
                  const isChecked = selectedChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={`p-2.5 rounded-xl border text-right flex items-center justify-between text-xs transition ${
                        isChecked
                          ? 'bg-blue-50 border-brand text-brand font-bold'
                          : 'bg-neutral-50 border-border text-neutral-600 hover:bg-white'
                      }`}
                    >
                      <span>{ch}</span>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                          isChecked ? 'bg-brand text-white' : 'border border-neutral-300'
                        }`}
                      >
                        {isChecked ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block mb-1 text-ink">
                رابط صفحتك أو قناتك التسويقية (فيسبوك، تيك توك، إنستغرام، تليجرام)
              </label>
              <input
                type="url"
                value={channelLinks}
                onChange={(e) => setChannelLinks(e.target.value)}
                placeholder="https://facebook.com/your_page_or_tiktok"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-ink">مستوى خبرتك السابقة في التسويق بالعمولة</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink bg-white focus:outline-none focus:border-brand"
                >
                  <option value="beginner">مبتدئ (أول تجربة لي في الأفلييت)</option>
                  <option value="intermediate">متوسط (لدي خبرة وأبيع من قبل)</option>
                  <option value="expert">محترف (أدير حملات إعلانية ممولة ومبيعات يومية)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-ink">المبيعات المتوقعة شهرياً</label>
                <select
                  value={expectedMonthlyOrders}
                  onChange={(e) => setExpectedMonthlyOrders(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink bg-white focus:outline-none focus:border-brand"
                >
                  <option value="under-20">أقل من 20 قطعة شهرياً</option>
                  <option value="20-50">20 - 50 قطعة شهرياً</option>
                  <option value="50-100">50 - 100 قطعة شهرياً</option>
                  <option value="over-100">أكثر من 100 قطعة شهرياً (VIP Tier)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 bg-neutral-100 hover:bg-neutral-200 text-ink font-semibold text-xs rounded-xl transition"
              >
                &rarr; السابق
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="w-2/3 py-3 bg-ink hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                المتابعة إلى بيانات استلام الأرباح &larr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Payout Details & Final Submission */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-neutral-700">
            <div>
              <label className="block mb-2 text-ink">
                طريقة استلام أرباحك وعمولاتك المفضلة <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('vodafone_cash')}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                    payoutMethod === 'vodafone_cash'
                      ? 'bg-red-50 border-red-500 text-red-700 font-bold'
                      : 'bg-neutral-50 border-border text-neutral-600'
                  }`}
                >
                  <Smartphone size={18} />
                  <span>فودافون كاش</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('instapay')}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                    payoutMethod === 'instapay'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold'
                      : 'bg-neutral-50 border-border text-neutral-600'
                  }`}
                >
                  <CreditCard size={18} />
                  <span>إنستاباي (InstaPay)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank_transfer')}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                    payoutMethod === 'bank_transfer'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                      : 'bg-neutral-50 border-border text-neutral-600'
                  }`}
                >
                  <Building size={18} />
                  <span>تحويل بنكي</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-1 text-ink">
                {payoutMethod === 'vodafone_cash'
                  ? 'رقم محفظة فودافون كاش *'
                  : payoutMethod === 'instapay'
                  ? 'عنوان أو معرف إنستاباي (IPA / Mobile) *'
                  : 'رقم الحساب البنكي أو الآيبان (IBAN) *'}
              </label>
              <input
                type="text"
                required
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                placeholder={
                  payoutMethod === 'vodafone_cash'
                    ? '010XXXXXXXX'
                    : payoutMethod === 'instapay'
                    ? 'name@instapay أو 01xxxxxxxxx'
                    : 'EG0000000000000000000000000'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-ink">اسم صاحب الحساب أو المحفظة</label>
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="إذا كان نفس اسمك اتركه فارغاً"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink focus:outline-none focus:border-brand"
                />
              </div>

              {payoutMethod === 'bank_transfer' && (
                <div>
                  <label className="block mb-1 text-ink">اسم البنك</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="مثال: البنك الأهلي المصري"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink focus:outline-none focus:border-brand"
                  />
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] leading-relaxed flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-600 flex-shrink-0" />
              <span>
                يتم إرسال طلب انضمامك مباشرة إلى إدارة المنصة لمراجعته واعتماده، وستتمكن فور الإرسال من تصفح دليل المسوق الكامل وكيفية العمل والربح.
              </span>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-3 bg-neutral-100 hover:bg-neutral-200 text-ink font-semibold text-xs rounded-xl transition"
              >
                &rarr; السابق
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-3 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                {loading ? 'جاري إرسال الطلب...' : 'إرسال طلب الانضمام واعتماد الحساب ✓'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
