'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalErrorBoundary]', error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#FAFAFA] text-[#09090B] min-h-screen flex items-center justify-center p-6 font-sans antialiased">
        <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-4 shadow-sm">
          <h1 className="text-lg font-bold">تعذر تحميل الصفحة / Application Error</h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            حدث خطأ حرج أثناء تشغيل التطبيق. اضغط لإعادة التحميل والمحاولة مجدداً.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-zinc-400">Ref: {error.digest}</p>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl bg-[#09090B] text-white text-xs font-bold hover:bg-zinc-800 transition-colors"
            >
              إعادة التحميل / Reload
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-zinc-100 text-[#09090B] text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              الصفحة الرئيسية
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
