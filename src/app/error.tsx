'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppErrorBoundary]', error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-canvas">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-subtle p-7 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={24} strokeWidth={1.6} />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-ink">حدث خطأ غير متوقع / Unexpected Error</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            نعتذر عن هذا الخلل المؤقت. يمكنك إعادة المحاولة الآن أو العودة للصفحة الرئيسية.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-neutral-400 pt-1">
              Ref: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2.5 rounded-xl bg-ink hover:bg-neutral-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} />
            <span>إعادة المحاولة / Try Again</span>
          </button>

          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-ink text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Home size={14} />
            <span>الرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
