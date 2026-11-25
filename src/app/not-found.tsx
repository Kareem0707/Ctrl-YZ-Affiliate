import Link from 'next/link';
import { Home, ShoppingBag, Truck, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-canvas">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-subtle p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-neutral-100 border border-border font-mono font-bold text-sm text-ink">
          404
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-ink">الصفحة غير موجودة / Page Not Found</h1>
          <p className="text-xs text-ink-muted leading-relaxed">
            الرابط الذي تبحث عنه غير متوفر أو تم نقله. يمكنك تصفح المتجر أو الانضمام لبرنامج المسوقين.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-ink hover:bg-neutral-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home size={14} />
            <span>المتجر الرئيسي</span>
          </Link>

          <Link
            href="/join"
            className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles size={14} />
            <span>برنامج المسوقين</span>
          </Link>
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-center gap-4 text-xs text-ink-muted">
          <Link href="/track-order" className="hover:text-ink inline-flex items-center gap-1">
            <Truck size={13} />
            <span>تتبع شحنتك</span>
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:text-ink inline-flex items-center gap-1">
            <ShoppingBag size={13} />
            <span>تسجيل الدخول</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
