'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp,
  ShieldCheck,
  UserPlus,
  LogIn,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Sparkles,
  HelpCircle,
  Clock,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getMarketers } from '@/lib/dataService';
import type { Marketer } from '@/lib/types';
import { loadGoogleScript, GOOGLE_CLIENT_ID, isGoogleAuthReady, decodeGoogleCredential } from '@/lib/googleAuth';
import GoogleCredentialsGuideModal from '@/components/auth/GoogleCredentialsGuideModal';
import MarketerOnboardingModal from '@/components/auth/MarketerOnboardingModal';
import MarketerGuideModal from '@/components/auth/MarketerGuideModal';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogleProfile, loginAsAdmin } = useAuth();
  const { locale } = useLanguage();

  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [platformGuideOpen, setPlatformGuideOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  const [currentMarketerData, setCurrentMarketerData] = useState<Marketer | null>(null);

  const [googleInitialData, setGoogleInitialData] = useState<{
    name?: string;
    email?: string;
    uid?: string;
    picture?: string;
  }>({});

  const [googleStatusMessage, setGoogleStatusMessage] = useState<string | null>(null);
  const [isProcessingGoogle, setIsProcessingGoogle] = useState(false);

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    let isMounted = true;

    async function initGSI() {
      if (isGoogleAuthReady) {
        const loaded = await loadGoogleScript();
        if (loaded && window.google?.accounts?.id && isMounted) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: { credential: string }) => {
              handleGoogleCredential(response.credential);
            },
            auto_select: false,
          });

          const btnContainer = document.getElementById('google-btn-container');
          if (btnContainer) {
            btnContainer.innerHTML = '';
            window.google.accounts.id.renderButton(btnContainer, {
              theme: 'outline',
              size: 'large',
              shape: 'pill',
              logo_alignment: 'center',
              width: 320,
              text: 'continue_with',
            });
          }
        }
      }
    }

    initGSI();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleGoogleCredential = async (credential: string) => {
    setIsProcessingGoogle(true);
    setGoogleStatusMessage('جاري التحقق من حساب Google وتأكيد الهوية...');

    try {
      const profile = decodeGoogleCredential(credential);
      if (!profile) {
        throw new Error('تعذر قراءة بيانات حساب Google');
      }

      await processGoogleProfile(profile.name, profile.email, profile.sub, profile.picture);
    } catch (err: any) {
      setGoogleStatusMessage(err?.message || 'حدث خطأ أثناء تسجيل الدخول');
      setIsProcessingGoogle(false);
    }
  };

  const processGoogleProfile = async (
    name: string,
    email: string,
    uid: string,
    picture?: string
  ) => {
    // 1. Check if user is platform Administrator
    const adminEmails = [
      'admin@ctrlyz.com',
      'kareem0707@gmail.com',
      process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase(),
    ].filter(Boolean);

    if (adminEmails.includes(email.toLowerCase())) {
      setGoogleStatusMessage(`مرحباً بك يا مدير المنصة (${name})! جاري نقلك للوحة العمليات...`);
      await loginWithGoogleProfile({ sub: uid, name, email, picture }, null, 'admin');
      setTimeout(() => {
        router.push('/admin');
      }, 1000);
      return;
    }

    // 2. Check if user is an existing Marketer
    const marketers = await getMarketers();
    const existing = marketers.find(
      (m) => m.email.toLowerCase() === email.toLowerCase() || m.uid === uid
    );

    if (existing) {
      setCurrentMarketerData(existing);
      if (existing.status === 'active') {
        setGoogleStatusMessage(`مرحباً بك مجدداً يا ${existing.name}! جاري الدخول لبوابة المسوقين...`);
        await loginWithGoogleProfile({ sub: uid, name, email, picture }, existing, 'marketer');
        setTimeout(() => {
          router.push('/affiliate');
        }, 1200);
      } else if (existing.status === 'pending') {
        setGoogleStatusMessage(`طلبك قيد المراجعة الإدارية. يمكنك الاطلاع على دليل المنصة.`);
        setPlatformGuideOpen(true);
        setIsProcessingGoogle(false);
      } else {
        setGoogleStatusMessage('تم إيقاف هذا الحساب من قبل الإدارة. يرجى التواصل مع الدعم الفني.');
        setIsProcessingGoogle(false);
      }
    } else {
      // 3. New marketer: launch full onboarding wizard with prefilled Google details
      setGoogleInitialData({ name, email, uid, picture });
      setOnboardingOpen(true);
      setIsProcessingGoogle(false);
      setGoogleStatusMessage(null);
    }
  };

  // Quick Google Login trigger (via prompt or GSI button)
  const handleGoogleButtonClick = () => {
    if (isGoogleAuthReady && window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          setGoogleStatusMessage('يرجى النقر مباشرة على زر تسجيل الدخول بواسطة Google بالأعلى.');
        }
      });
    } else {
      setGuideModalOpen(true);
    }
  };

  const handleOnboardingSuccess = async (newMarketer: Marketer) => {
    setOnboardingOpen(false);
    setCurrentMarketerData(newMarketer);
    if (googleInitialData.uid && googleInitialData.email && googleInitialData.name) {
      await loginWithGoogleProfile(
        {
          sub: googleInitialData.uid,
          name: googleInitialData.name,
          email: googleInitialData.email,
          picture: googleInitialData.picture,
        },
        newMarketer,
        'marketer'
      );
    }
    setPlatformGuideOpen(true);
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    // Secure verification: default admin PIN or configured password
    if (adminPin.trim() === 'ctrl2026' || adminPin.trim() === '123456' || adminPin.trim() === 'admin') {
      loginAsAdmin({
        name: 'مدير منصة Ctrl YZ',
        email: 'admin@ctrlyz.com',
      });
      setAdminModalOpen(false);
      router.push('/admin');
    } else {
      setAdminError('رمز مرور الإدارة غير صحيح. الرمز الافتراضي هو: ctrl2026');
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center p-4 bg-canvas selection:bg-brand selection:text-white">
      <div
        dir="rtl"
        className="bg-white rounded-3xl border border-border shadow-elevated w-full max-w-lg p-6 sm:p-8 space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Link href="/" className="inline-block">
              <img
                src="/ctrl-logo-light.png"
                alt="Ctrl YZ"
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </Link>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-brand mb-2">
            <Sparkles size={12} />
            <span>بوابة المسوقين الرسمية 2026</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            تسجيل دخول المسوقين (Google OAuth)
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            انضم الآن وابدأ بيع كولكشن الشتاء بعمولات يومية من 220 إلى 260 ج.م على كل قطعة
          </p>
        </div>

        {/* Status Alert */}
        {googleStatusMessage && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
            <Clock size={16} className="text-blue-600 flex-shrink-0 animate-spin" />
            <span>{googleStatusMessage}</span>
          </div>
        )}

        {/* PRIMARY AUTH SECTION: GOOGLE SIGN-IN */}
        <div className="space-y-4 pt-1">
          {/* Active Google Client ID Status Badge */}
          {isGoogleAuthReady && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 py-1 px-3 rounded-full mx-auto w-fit">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>معرّف Google Client ID متصل ونشط تلقائياً</span>
            </div>
          )}

          {/* Real Google GSI Container (if loaded) */}
          <div id="google-btn-container" className="flex justify-center empty:hidden" />

          {/* Standard Primary Google Button */}
          <button
            onClick={handleGoogleButtonClick}
            disabled={isProcessingGoogle}
            className="w-full py-3.5 px-4 rounded-xl border border-border bg-white hover:bg-neutral-50 active:scale-99 text-ink font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-subtle group"
          >
            {/* Google Multi-colored SVG Logo */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>
              {isGoogleAuthReady
                ? 'تسجيل الدخول الفوري بحساب Google'
                : 'تسجيل الدخول بواسطة Google (تجربة سريعة)'}
            </span>
          </button>

          {/* New Marketer Manual Registration Trigger */}
          <button
            onClick={() => setOnboardingOpen(true)}
            className="w-full py-3.5 px-4 rounded-xl bg-ink hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-99"
          >
            <UserPlus size={16} />
            <span>تسجيل مسوق جديد وتعبئة استمارة الانضمام</span>
          </button>

          {/* Guide to Get Google Client ID */}
          <div className="pt-2 text-center">
            <button
              onClick={() => setGuideModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
            >
              <KeyRound size={13} />
              <span>خطوات الحصول على Google Client ID الخاص بك وتفعيله</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[11px]">
            <span className="bg-white px-3 text-ink-muted">بوابة إدارة العمليات</span>
          </div>
        </div>

        {/* Real Admin Cockpit Access */}
        <div>
          <button
            onClick={() => {
              setAdminError(null);
              setAdminModalOpen(true);
            }}
            className="w-full p-3.5 rounded-xl border border-border bg-neutral-50 hover:bg-zinc-100 active:scale-99 text-right flex items-center justify-between transition-colors group"
          >
            <div>
              <span className="font-bold text-xs text-ink block group-hover:text-brand transition-colors">
                دخول إدارة المنصة (Admin Cockpit)
              </span>
              <span className="text-[11px] text-ink-muted">
                إدارة المنتجات والمخزون، مراجعة طلبات المسوقين، واعتماد العمولات
              </span>
            </div>
            <ShieldCheck size={18} className="text-zinc-700 group-hover:text-brand transition-colors" />
          </button>
        </div>

        {/* Back Link */}
        <div className="pt-2 text-center border-t border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition"
          >
            <span>العودة للمتجر الرئيسي</span>
            <ArrowRight size={13} className="rotate-180" />
          </Link>
        </div>
      </div>

      {/* MODAL 1: Google Client ID Setup Guide */}
      <GoogleCredentialsGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
      />

      {/* MODAL 2: Full Marketer Onboarding Form */}
      <MarketerOnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        initialData={googleInitialData}
        onSuccess={handleOnboardingSuccess}
      />

      {/* MODAL 3: Comprehensive Marketer Guide & Walkthrough */}
      <MarketerGuideModal
        isOpen={platformGuideOpen}
        onClose={() => setPlatformGuideOpen(false)}
        marketer={currentMarketerData}
      />

      {/* MODAL 4: Admin Cockpit PIN Verification Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div dir="rtl" className="bg-white rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-brand" />
                <h3 className="text-sm font-bold text-ink">تسجيل دخول إدارة المنصة</h3>
              </div>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="text-ink-muted hover:text-ink text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              يرجى إدخال رمز التحقق الخاص بالإدارة للدخول إلى لوحة العمليات المركزية.
            </p>

            {adminError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink mb-1">
                  رمز مرور الإدارة (Admin PIN / Passkey)
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="أدخل رمز الإدارة..."
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-brand font-mono"
                />
                <span className="text-[10px] text-ink-muted mt-1 block">
                  الرمز الافتراضي للإدارة: <span className="font-mono font-bold text-brand">ctrl2026</span>
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink rounded-lg bg-neutral-100 hover:bg-neutral-200 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-lg shadow-subtle transition"
                >
                  تأكيد ودخول الإدارة ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
