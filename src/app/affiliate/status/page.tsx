'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  LogOut,
  BookOpen,
  Smartphone,
  Mail,
  Send,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import MarketerGuideModal from '@/components/auth/MarketerGuideModal';

export default function AffiliateStatusPage() {
  const router = useRouter();
  const { user, loading, isAdmin, currentMarketer, refreshSession, logout } = useAuth();

  const [guideOpen, setGuideOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // OTP Verification State (for UNVERIFIED status)
  const [channel, setChannel] = useState<'WHATSAPP_OTP' | 'EMAIL'>('WHATSAPP_OTP');
  const [otpCode, setOtpCode] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/affiliate/status');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && currentMarketer?.dbStatus === 'ACTIVE') {
      router.replace('/affiliate');
    }
  }, [loading, currentMarketer?.dbStatus, router]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSession();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const res = await fetch('/api/auth/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.retryAfterSeconds) setCooldown(data.retryAfterSeconds);
        throw new Error(data.error || 'تعذر إرسال رمز التحقق');
      }
      setOtpSentTo(data.maskedTarget || '');
      setCooldown(data.cooldownSeconds || 60);
      setOtpSuccess(
        `تم إرسال رمز التحقق المكون من 6 أرقام إلى ${data.maskedTarget || 'وسيلة التواصل المسجلة'}.`
      );
    } catch (err: any) {
      setOtpError(err?.message || 'حدث خطأ أثناء إرسال الرمز');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setOtpError('يرجى إدخال رمز تحقق صحيح مكون من 6 أرقام.');
      return;
    }

    setConfirmingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const res = await fetch('/api/auth/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channel, code: otpCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'رمز التحقق غير صحيح');
      }
      setOtpSuccess('تم توثيق حسابك بنجاح! تم تحويل طلبك للمراجعة الإدارية.');
      setOtpCode('');
      await refreshSession();
    } catch (err: any) {
      setOtpError(err?.message || 'تعذر تأكيد رمز التحقق');
    } finally {
      setConfirmingOtp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-canvas p-6">
        <div className="text-center space-y-3">
          <RefreshCw size={26} className="mx-auto text-brand animate-spin" />
          <p className="text-xs font-medium text-ink-muted">جاري التحقق من حالة حسابك...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!currentMarketer && !isAdmin) {
    return (
      <div dir="rtl" className="min-h-[75vh] flex items-center justify-center p-4 bg-canvas">
        <div className="bg-white rounded-2xl border border-border shadow-elevated max-w-md w-full p-7 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand border border-blue-200 flex items-center justify-center mx-auto">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-lg font-bold text-ink">استكمال استمارة الانضمام</h1>
          <p className="text-xs text-ink-muted leading-relaxed">
            أنت مسجل الدخول بحسابك ({user.email})، لكن لم تقم بتعبئة بيانات المسوق بعد.
          </p>
          <Link
            href="/login?step=onboarding"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition"
          >
            <span>تعبئة استمارة المسوق الآن</span>
            <ArrowRight size={14} className="rotate-180" />
          </Link>
        </div>
      </div>
    );
  }

  const dbStatus = currentMarketer?.dbStatus || 'PENDING';

  return (
    <div dir="rtl" className="min-h-[82vh] flex items-center justify-center p-4 bg-canvas">
      <div className="bg-white rounded-3xl border border-border shadow-elevated max-w-xl w-full p-6 sm:p-8 space-y-6">
        {/* ── STATE 1: UNVERIFIED (OTP VERIFICATION REQUIRED) ── */}
        {dbStatus === 'UNVERIFIED' && (
          <>
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-brand flex items-center justify-center mx-auto">
                <Smartphone size={26} strokeWidth={1.8} />
              </div>
              <span className="inline-block text-[11px] font-bold px-3 py-0.5 rounded-full bg-blue-50 text-brand border border-blue-200">
                خطوة التحقق الإلزامية (OTP)
              </span>
              <h1 className="text-xl font-bold text-ink">تأكيد رقم الهاتف لتفعيل مراجعة الطلب</h1>
              <p className="text-xs text-ink-muted leading-relaxed max-w-md mx-auto">
                لحماية حسابات المسوقين والعمولات، يرجى تأكيد هويتك برمز تحقق من 6 أرقام قبل إحالة طلبك لمكتب الإدارة.
              </p>
            </div>

            {otpError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0 text-rose-600" />
                <span>{otpError}</span>
              </div>
            )}

            {otpSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-600" />
                <span>{otpSuccess}</span>
              </div>
            )}

            {/* Channel selector */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setChannel('WHATSAPP_OTP')}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                  channel === 'WHATSAPP_OTP'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-neutral-50 border-border text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Smartphone size={15} />
                <span>واتساب ({currentMarketer?.whatsapp})</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                  channel === 'EMAIL'
                    ? 'bg-blue-50 border-brand text-brand'
                    : 'bg-neutral-50 border-border text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Mail size={15} />
                <span>البريد الإلكتروني</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sendingOtp || cooldown > 0}
              className="w-full py-3 rounded-xl bg-ink hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Send size={14} />
              <span>
                {sendingOtp
                  ? 'جاري إرسال رمز التحقق...'
                  : cooldown > 0
                  ? `يمكن إعادة الإرسال بعد ${cooldown} ثانية`
                  : otpSentTo
                  ? 'إعادة إرسال رمز التحقق'
                  : 'إرسال رمز التحقق (6 أرقام)'}
              </span>
            </button>

            <form onSubmit={handleConfirmOtp} className="space-y-3 pt-2 border-t border-border">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  أدخل رمز التحقق المكون من 6 أرقام
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl border border-border text-center text-lg font-mono tracking-[0.4em] font-bold text-ink focus:outline-none focus:border-brand"
                />
              </div>
              <button
                type="submit"
                disabled={confirmingOtp || otpCode.length !== 6}
                className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition disabled:opacity-50"
              >
                {confirmingOtp ? 'جاري التحقق...' : 'تأكيد الرمز وإرسال الطلب للمراجعة ✓'}
              </button>
            </form>
          </>
        )}

        {/* ── STATE 2: PENDING REVIEW ── */}
        {dbStatus === 'PENDING' && (
          <>
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <Clock size={26} strokeWidth={1.8} />
              </div>
              <span className="inline-block text-[11px] font-bold px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                قيد المراجعة الإدارية
              </span>
              <h1 className="text-xl font-bold text-ink">
                تم توثيق بياناتك وطلبك قيد المراجعة الآن
              </h1>
              <p className="text-xs text-ink-muted leading-relaxed max-w-md mx-auto">
                يقوم فريق إدارة Ctrl YZ بمراجعة بياناتك والتحقق من حسابك. فور الاعتماد سيُفتح لك الوصول الكامل لبوابة المسوقين ولوحة العمولات تلقائياً.
              </p>
            </div>

            {currentMarketer && (
              <div className="bg-neutral-50 rounded-2xl border border-border p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">الاسم المسجل:</span>
                  <span className="font-bold text-ink">{currentMarketer.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">كود الإحالة المخصص (يُفعّل بعد القبول):</span>
                  <span className="font-mono font-bold text-brand">{currentMarketer.affiliateCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">رقم الواتساب الموثّق:</span>
                  <span className="font-mono font-semibold text-ink">{currentMarketer.whatsapp}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="py-3 px-4 rounded-xl bg-ink hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <BookOpen size={15} />
                <span>تصفح دليل المسوقين</span>
              </button>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="py-3 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-ink text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'جاري التحديث...' : 'تحديث حالة الطلب'}</span>
              </button>
            </div>
          </>
        )}

        {/* ── STATE 3: REJECTED OR SUSPENDED ── */}
        {(dbStatus === 'REJECTED' || dbStatus === 'SUSPENDED') && (
          <>
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert size={26} strokeWidth={1.8} />
              </div>
              <span className="inline-block text-[11px] font-bold px-3 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                {dbStatus === 'REJECTED' ? 'لم يتم قبول الطلب' : 'الحساب موقوف مؤقتاً'}
              </span>
              <h1 className="text-xl font-bold text-ink">
                {dbStatus === 'REJECTED'
                  ? 'نعتذر، تم رفض طلب الانضمام'
                  : 'تم تعليق صلاحية حساب المسوق'}
              </h1>
              {currentMarketer?.rejectionReason && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs leading-relaxed text-right">
                  <strong className="block mb-0.5">السبب المسجل من الإدارة:</strong>
                  <span>{currentMarketer.rejectionReason}</span>
                </div>
              )}
              <p className="text-xs text-ink-muted leading-relaxed">
                للاستفسار أو تقديم تظلم ومراجعة البيانات، يرجى التواصل مع فريق دعم المسوقين عبر الواتساب الرسمي.
              </p>
            </div>
          </>
        )}

        {/* Footer actions */}
        <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
          <Link
            href="/"
            className="text-ink-muted hover:text-ink font-medium inline-flex items-center gap-1 transition"
          >
            <span>العودة للمتجر</span>
            <ArrowRight size={13} className="rotate-180" />
          </Link>

          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push('/login');
            }}
            className="text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1.5 transition"
          >
            <LogOut size={13} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      <MarketerGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        marketer={currentMarketer}
      />
    </div>
  );
}
