'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Building,
  Smartphone,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import type { Marketer } from '@/lib/types';
import {
  EGYPTIAN_NATIONAL_ID_REGEX,
  EGYPTIAN_PHONE_REGEX,
} from '@/lib/validators';

interface MarketerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    name?: string;
    email?: string;
    uid?: string;
    picture?: string;
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
  'شمال سيناء',
  'جنوب سيناء',
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

function normalizeEgyptPhone(raw: string): string {
  return raw.trim().replace(/[\s-]/g, '').replace(/^\+?20/, '0');
}

function isValidEgyptianNationalId(raw: string): boolean {
  const cleaned = raw.trim();
  if (!EGYPTIAN_NATIONAL_ID_REGEX.test(cleaned)) return false;
  const month = Number(cleaned.slice(3, 5));
  const day = Number(cleaned.slice(5, 7));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

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
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'صفحة فيسبوك (Facebook Page)',
  ]);
  const [channelLinks, setChannelLinks] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<
    'beginner' | 'intermediate' | 'expert'
  >('intermediate');
  const [expectedMonthlyOrders, setExpectedMonthlyOrders] = useState('20-50');

  // Payout Information
  const [payoutMethod, setPayoutMethod] = useState<
    'VODAFONE_CASH' | 'INSTAPAY' | 'BANK_TRANSFER'
  >('VODAFONE_CASH');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');

  // Fix [P0-12]: Sync prefilled Google profile whenever initialData or modal open state changes
  useEffect(() => {
    if (isOpen) {
      if (initialData?.name) setName(initialData.name);
      if (initialData?.email) setEmail(initialData.email);
      setError(null);
      setStep(1);
    }
  }, [isOpen, initialData?.name, initialData?.email]);

  if (!isOpen) return null;

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!name.trim() || name.trim().length < 6) {
        setError('يرجى كتابة الاسم الكامل (6 أحرف على الأقل، مطابق للبطاقة).');
        return;
      }
      const normPhone = normalizeEgyptPhone(phone);
      if (!EGYPTIAN_PHONE_REGEX.test(normPhone)) {
        setError(
          'رقم الهاتف المصري غير صحيح — يجب أن يتكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015.'
        );
        return;
      }
      const normWhatsapp = normalizeEgyptPhone(whatsapp || normPhone);
      if (!EGYPTIAN_PHONE_REGEX.test(normWhatsapp)) {
        setError('رقم الواتساب المصري غير صحيح — يجب أن يتكون من 11 رقماً.');
        return;
      }
      if (!isValidEgyptianNationalId(nationalId)) {
        setError(
          'الرقم القومي المصري إلزامي ويجب أن يتكون من 14 رقماً صحيحاً ويبدأ بـ 2 أو 3.'
        );
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

    const normPhone = normalizeEgyptPhone(phone);
    const normWhatsapp = normalizeEgyptPhone(whatsapp || normPhone);
    const cleanedAccount = payoutAccount.trim();

    if (!cleanedAccount || cleanedAccount.length < 6) {
      setError('يرجى إدخال رقم المحفظة أو حساب إنستاباي أو الحساب البنكي بدقة.');
      return;
    }

    if (
      payoutMethod === 'VODAFONE_CASH' &&
      !EGYPTIAN_PHONE_REGEX.test(normalizeEgyptPhone(cleanedAccount))
    ) {
      setError('رقم محفظة فودافون كاش يجب أن يكون رقم هاتف مصري صحيح (11 رقماً).');
      return;
    }

    if (payoutMethod === 'BANK_TRANSFER' && !bankName.trim()) {
      setError('يرجى إدخال اسم البنك عند اختيار التحويل البنكي.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/marketers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          phone: normPhone,
          whatsapp: normWhatsapp,
          nationalId: nationalId.trim(),
          city,
          marketingChannels: selectedChannels,
          channelLinks: channelLinks.trim() || undefined,
          experienceLevel,
          expectedMonthlyOrders,
          payoutMethod,
          payoutAccount:
            payoutMethod === 'VODAFONE_CASH'
              ? normalizeEgyptPhone(cleanedAccount)
              : cleanedAccount,
          payoutHolderName: accountHolderName.trim() || name.trim(),
          payoutBankName: payoutMethod === 'BANK_TRANSFER' ? bankName.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'تعذر تسجيل طلب الانضمام. يرجى مراجعة البيانات.');
      }

      onSuccess(data.affiliate);
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
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-border shadow-2xl p-6 sm:p-8 space-y-6"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_8px_#0258ED]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                برنامج مسوقي Ctrl YZ الرسمي
              </span>
            </div>
            <h2 className="text-xl font-bold text-ink tracking-tight">
              استكمال طلب انضمام مسوق جديد
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              بعد إرسال الاستمارة ستنتقل لتأكيد رمز التحقق (OTP) ثم مراجعة الإدارة لتفعيل الحساب
            </p>
          </div>
          <button
            type="button"
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
                placeholder="مثال: أحمد محمد محمود علي"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-ink">
                  رقم الهاتف المصري الأساسي <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={14}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block mb-1 text-ink">
                  رقم الواتساب (لاستلام رمز OTP والتأكيدات) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={14}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="010XXXXXXXX (أو اتركه مطابقاً للهاتف)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-ink">
                  الرقم القومي المصري (14 رقماً) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={14}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  placeholder="29901011234567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block mb-1 text-ink">
                  المحافظة / المدينة <span className="text-red-500">*</span>
                </label>
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

            <div>
              <label className="block mb-1 text-ink">
                البريد الإلكتروني الموثّق عبر Google
              </label>
              <input
                type="email"
                value={email}
                readOnly
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-ink-muted bg-neutral-100 cursor-not-allowed"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-3 bg-ink hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                المتابعة إلى قنوات التسويق &larr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Marketing Channels & Experience */}
        {step === 2 && (
          <div className="space-y-4 text-xs font-semibold text-neutral-700">
            <div>
              <label className="block mb-2 text-ink">
                أين ستقوم بتسويق منتجات Ctrl YZ؟ (اختر قناة أو أكثر){' '}
                <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MARKETING_CHANNELS.map((ch) => {
                  const active = selectedChannels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className={`p-2.5 rounded-xl border text-right flex items-center gap-2 transition ${
                        active
                          ? 'bg-blue-50 border-brand text-brand font-bold'
                          : 'bg-neutral-50 border-border text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] ${
                          active
                            ? 'bg-brand border-brand text-white'
                            : 'bg-white border-neutral-300'
                        }`}
                      >
                        {active ? '✓' : ''}
                      </span>
                      <span className="truncate">{ch}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block mb-1 text-ink">
                روابط صفحاتك أو قنواتك الإعلانية (اختياري)
              </label>
              <textarea
                rows={2}
                value={channelLinks}
                onChange={(e) => setChannelLinks(e.target.value)}
                placeholder="https://facebook.com/yourpage أو حساب تيك توك / إنستغرام..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-mono text-ink focus:outline-none focus:border-brand resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-ink">مستوى الخبرة في التسويق بالعمولة</label>
                <select
                  value={experienceLevel}
                  onChange={(e) =>
                    setExperienceLevel(e.target.value as 'beginner' | 'intermediate' | 'expert')
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink bg-white focus:outline-none focus:border-brand"
                >
                  <option value="beginner">مبتدئ (سأبدأ أولى حملاتي الآن)</option>
                  <option value="intermediate">متوسط (سبق لي البيع عبر السوشيال ميديا)</option>
                  <option value="expert">محترف (إعلانات ممولة وميديا باينج يومي)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-ink">متوسط الطلبات المتوقعة شهرياً</label>
                <select
                  value={expectedMonthlyOrders}
                  onChange={(e) => setExpectedMonthlyOrders(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs text-ink bg-white focus:outline-none focus:border-brand"
                >
                  <option value="10-20">10 - 20 قطعة</option>
                  <option value="20-50">20 - 50 قطعة</option>
                  <option value="50-150">50 - 150 قطعة</option>
                  <option value="150+">أكثر من 150 قطعة شهرياً</option>
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
                  onClick={() => setPayoutMethod('VODAFONE_CASH')}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                    payoutMethod === 'VODAFONE_CASH'
                      ? 'bg-red-50 border-red-500 text-red-700 font-bold'
                      : 'bg-neutral-50 border-border text-neutral-600'
                  }`}
                >
                  <Smartphone size={18} />
                  <span>فودافون كاش</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('INSTAPAY')}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                    payoutMethod === 'INSTAPAY'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold'
                      : 'bg-neutral-50 border-border text-neutral-600'
                  }`}
                >
                  <CreditCard size={18} />
                  <span>إنستاباي (InstaPay)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('BANK_TRANSFER')}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                    payoutMethod === 'BANK_TRANSFER'
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
                {payoutMethod === 'VODAFONE_CASH'
                  ? 'رقم محفظة فودافون كاش (11 رقماً) *'
                  : payoutMethod === 'INSTAPAY'
                  ? 'عنوان أو معرف إنستاباي (IPA / Mobile) *'
                  : 'رقم الحساب البنكي أو الآيبان (IBAN) *'}
              </label>
              <input
                type="text"
                required
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                placeholder={
                  payoutMethod === 'VODAFONE_CASH'
                    ? '010XXXXXXXX'
                    : payoutMethod === 'INSTAPAY'
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

              {payoutMethod === 'BANK_TRANSFER' && (
                <div>
                  <label className="block mb-1 text-ink">
                    اسم البنك <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
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
                سيتم إنشاء كود إحالة إنجليزي فريد لك، ثم نقلك فوراً لخطوة التحقق برمز OTP قبل مراجعة واعتماد الإدارة.
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
                {loading ? 'جاري تسجيل الطلب...' : 'إرسال البيانات والانتقال للتحقق (OTP) ✓'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
