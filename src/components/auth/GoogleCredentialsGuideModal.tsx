'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, KeyRound, ShieldCheck, CheckCircle2, Terminal } from 'lucide-react';

interface GoogleCredentialsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoogleCredentialsGuideModal({ isOpen, onClose }: GoogleCredentialsGuideModalProps) {
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (!isOpen) return null;

  const envSnippet = `NEXT_PUBLIC_GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div
        dir="rtl"
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl p-6 sm:p-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <KeyRound size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-ink">
                دليل تفعيل تسجيل الدخول الحقيقي بحساب Google
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                الخطوات الرسمية للحصول على Google Client ID وربطه بمنصة Ctrl YZ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-neutral-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Steps List */}
        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center">1</span>
                <span className="font-bold text-ink text-sm">إنشاء مشروع في Google Cloud Console</span>
              </div>
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
              >
                <span>فتح المنصة</span>
                <ExternalLink size={12} />
              </a>
            </div>
            <p className="text-ink-muted text-[11.5px] leading-relaxed pr-8">
              سجل دخولك بحساب Google الخاص بك، واضغط على قائمة المشاريع أعلى الصفحة واختر <strong>New Project</strong> ثم سَمِّ المشروع <strong>Ctrl YZ Affiliate</strong> واضغط <strong>Create</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center">2</span>
              <span className="font-bold text-ink text-sm">إعداد شاشة الموافقة (OAuth Consent Screen)</span>
            </div>
            <p className="text-ink-muted text-[11.5px] leading-relaxed pr-8">
              من القائمة الجانبية اختر <strong>APIs & Services</strong> ثم <strong>OAuth consent screen</strong>:
            </p>
            <ul className="list-disc list-inside pr-8 space-y-1 text-ink-muted text-[11px]">
              <li>اختر نوع المستخدم: <strong>External</strong> ثم Create.</li>
              <li>اسم التطبيق: <strong>Ctrl YZ Affiliate</strong>.</li>
              <li>بريد الدعم وبريد المطور: اكتب بريدك الإلكتروني.</li>
              <li>اضغط <strong>Save and Continue</strong> حتى الوصول للخطوة الأخيرة.</li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center">3</span>
              <span className="font-bold text-ink text-sm">إنشاء بيانات الاعتماد (OAuth 2.0 Client ID)</span>
            </div>
            <p className="text-ink-muted text-[11.5px] leading-relaxed pr-8">
              من نفس القائمة اختر <strong>Credentials</strong> ثم <strong>Create Credentials &rarr; OAuth client ID</strong>:
            </p>
            <div className="pr-8 space-y-2 text-[11px]">
              <div>
                <span className="font-semibold text-ink block mb-0.5">Application type:</span>
                <span className="bg-white border border-border px-2 py-0.5 rounded text-blue-700 font-mono">Web application</span>
              </div>
              <div>
                <span className="font-semibold text-ink block mb-1">Authorized JavaScript origins (العناوين المسموحة):</span>
                <div className="space-y-1 font-mono text-[10.5px]">
                  <div className="bg-white border border-border px-2.5 py-1 rounded text-neutral-800">http://localhost:3000</div>
                  <div className="bg-white border border-border px-2.5 py-1 rounded text-neutral-800">https://ctrl-yz-affiliate.vercel.app</div>
                </div>
              </div>
              <div>
                <span className="font-semibold text-ink block mb-1">Authorized redirect URIs:</span>
                <div className="space-y-1 font-mono text-[10.5px]">
                  <div className="bg-white border border-border px-2.5 py-1 rounded text-neutral-800">http://localhost:3000</div>
                  <div className="bg-white border border-border px-2.5 py-1 rounded text-neutral-800">https://ctrl-yz-affiliate.vercel.app</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
              <span className="font-bold text-emerald-900 text-sm">نسخ الـ Client ID ولصقه في ملف .env.local</span>
            </div>
            <p className="text-emerald-800 text-[11.5px] leading-relaxed pr-8">
              انسخ الـ <strong>Client ID</strong> (الذي ينتهي بـ <code className="bg-white px-1 rounded text-emerald-950 font-mono">.apps.googleusercontent.com</code>) وأضفه لملف <code className="bg-white px-1 rounded font-mono">.env.local</code> في جذر المشروع:
            </p>
            <div className="pr-8 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 text-white font-mono text-xs">
                <span className="overflow-x-auto select-all text-neutral-300">{envSnippet}</span>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 mr-3 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition"
                >
                  {copiedEnv ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedEnv ? 'تم النسخ!' : 'نسخ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>يتم التحقق من رموز Google على الخادم حصراً وإصدار جلسات HttpOnly آمنة</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-ink text-white text-xs font-bold hover:bg-neutral-800 transition"
          >
            فهمت، إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
