'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Sparkles,
  Clock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { loadGoogleScript, GOOGLE_CLIENT_ID, isGoogleAuthReady } from '@/lib/googleAuth';
import GoogleCredentialsGuideModal from '@/components/auth/GoogleCredentialsGuideModal';
import MarketerOnboardingModal from '@/components/auth/MarketerOnboardingModal';

function getSafeRedirectPath(raw: string | null): string | null {
  if (!raw) return null;
  // Strictly allow internal relative paths only (prevent open redirects)
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, nextStep, authenticateWithGoogle, refreshSession } = useAuth();

  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const [googleInitialData, setGoogleInitialData] = useState<{
    name?: string;
    email?: string;
    uid?: string;
    picture?: string;
  }>({});

  const [googleStatusMessage, setGoogleStatusMessage] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isProcessingGoogle, setIsProcessingGoogle] = useState(false);

  const redirectTarget = getSafeRedirectPath(searchParams.get('redirect'));
  const requestedStep = searchParams.get('step');

  const routeByNextStep = useCallback(
    (
      step: string | null,
      authUser?: { id?: string; name?: string; email?: string; avatarUrl?: string | null }
    ) => {
      if (step === 'admin') {
        router.push(redirectTarget && redirectTarget.startsWith('/admin') ? redirectTarget : '/admin');
        return;
      }
      if (step === 'affiliate_dashboard') {
        router.push(
          redirectTarget && redirectTarget.startsWith('/affiliate') ? redirectTarget : '/affiliate'
        );
        return;
      }
      if (step === 'onboarding') {
        setGoogleInitialData({
          uid: authUser?.id,
          name: authUser?.name,
          email: authUser?.email,
          picture: authUser?.avatarUrl ?? undefined,
        });
        setOnboardingOpen(true);
        return;
      }
      if (step === 'verify_otp' || step === 'pending_review' || step === 'rejected') {
        router.push('/affiliate/status');
      }
    },
    [redirectTarget, router]
  );

  // If user is already authenticated when opening /login
  useEffect(() => {
    if (loading || !user) return;
    if (requestedStep === 'onboarding' && nextStep === 'onboarding') {
      setGoogleInitialData({
        uid: user.id,
        name: user.name,
        email: user.email,
        picture: user.avatarUrl ?? undefined,
      });
      setOnboardingOpen(true);
      return;
    }
    routeByNextStep(nextStep, user);
  }, [loading, user, nextStep, requestedStep, routeByNextStep]);

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setIsProcessingGoogle(true);
      setGoogleError(null);
      setGoogleStatusMessage('جاري التحقق الآمن من حساب Google على الخادم...');

      try {
        const result = await authenticateWithGoogle(credential);
        setGoogleStatusMessage(null);
        setIsProcessingGoogle(false);
        routeByNextStep(result.nextStep, result.user);
      } catch (err: any) {
        setGoogleStatusMessage(null);
        setGoogleError(err?.message || 'فشل تسجيل الدخول عبر Google');
        setIsProcessingGoogle(false);
      }
    },
    [authenticateWithGoogle, routeByNextStep]
  );

  // Initialize Google Identity Services button
  useEffect(() => {
    let isMounted = true;

    async function initGSI() {
      if (!isGoogleAuthReady) return;
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

    initGSI();
    return () => {
      isMounted = false;
    };
  }, [handleGoogleCredential]);

  const handleGoogleFallbackClick = () => {
    setGoogleError(null);
    if (isGoogleAuthReady && window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          setGoogleStatusMessage('يرجى النقر مباشرة على زر تسجيل الدخول الرسمي من Google بالأعلى.');
        }
      });
    } else {
      setGuideModalOpen(true);
    }
  };

  const handleOnboardingSuccess = async () => {
    setOnboardingOpen(false);
    await refreshSession();
    router.push('/affiliate/status');
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
              <Image
                src="/ctrl-logo-light.png"
                alt="Ctrl YZ"
                width={160}
                height={40}
                priority
                className="h-9 sm:h-10 w-auto object-contain"
              />
            </Link>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-brand mb-2">
            <Sparkles size={12} />
            <span>بوابة المسوقين والإدارة الرسمية 2026</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            تسجيل الدخول الآمن عبر Google
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            سجّل دخولك بحساب Google الحقيقي لمتابعة عمولاتك أو تقديم طلب انضمام كمسوق معتمد بعمولات 220 إلى 260 ج.م على كل قطعة
          </p>
        </div>

        {/* Status Alert */}
        {googleStatusMessage && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
            <Clock size={16} className="text-blue-600 flex-shrink-0 animate-spin" />
            <span>{googleStatusMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {googleError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>{googleError}</span>
          </div>
        )}

        {/* PRIMARY AUTH SECTION: SERVER-VERIFIED GOOGLE OAUTH */}
        <div className="space-y-4 pt-1">
          {isGoogleAuthReady && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 py-1 px-3 rounded-full mx-auto w-fit">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>التحقق الخادمي عبر Google OAuth 2.0 نشط</span>
            </div>
          )}

          {/* Official Google GSI Rendered Button */}
          <div id="google-btn-container" className="flex justify-center min-h-[44px]" />

          {/* Secondary trigger if GSI prompt needed */}
          <button
            type="button"
            onClick={handleGoogleFallbackClick}
            disabled={isProcessingGoogle}
            className="w-full py-3 px-4 rounded-xl border border-border bg-white hover:bg-neutral-50 active:scale-99 text-ink font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-subtle disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              {isProcessingGoogle ? 'جاري التحقق...' : 'المتابعة بحساب Google'}
            </span>
          </button>

          {/* Info box explaining secure role assignment */}
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-border text-[11px] text-ink-muted leading-relaxed flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-brand flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-ink mb-0.5">كيف يعمل التسجيل؟</p>
              <p>
                • المسوق الجديد: سجّل بحساب Google لتفتح لك استمارة الانضمام ثم تأكيد رمز OTP ثم مراجعة الإدارة.
                <br />• إدارة المنصة: يتم منح صلاحية الأدمن تلقائياً لحسابات Google المصرح بها فقط على الخادم.
              </p>
            </div>
          </div>

          {/* Setup Guide link for developers */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
            >
              <KeyRound size={13} />
              <span>دليل إعداد Google OAuth للمطورين</span>
            </button>
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-3 text-center border-t border-border">
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

      {/* MODAL 2: Server-Verified Marketer Onboarding Form */}
      <MarketerOnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        initialData={googleInitialData}
        onSuccess={handleOnboardingSuccess}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center bg-canvas">
          <Clock size={22} className="text-brand animate-spin" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
