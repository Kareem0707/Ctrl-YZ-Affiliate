'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Megaphone, Download } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdCopiesModalProps {
  product: Product;
  onClose: () => void;
}

export default function AdCopiesModal({ product, onClose }: AdCopiesModalProps) {
  const { locale } = useLanguage();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const copies = product.adCopies && product.adCopies.length > 0
    ? product.adCopies
    : [
        {
          title: 'إعلان فيسبوك وتيك توك رئيسي (عرض خاص وتوصيل سريع)',
          copy: `عرض لفترة محدودة على ${product.name_ar}\n- أعلى جودة وخامات ممتازة\n- معاينة كاملة للمنتج قبل الاستلام والدفع كاش\n- شحن لجميع المحافظات\nاحجز قطعتك الآن قبل نفاذ الكمية.`,
        },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 border border-border shadow-md relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
        >
          <X size={16} strokeWidth={1.6} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-ink flex items-center justify-center">
            <Megaphone size={20} strokeWidth={1.6} />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">
              {locale === 'ar' ? 'المواد التسويقية ونصوص الإعلانات' : 'Marketing Creatives & Ad Copies'}
            </h3>
            <p className="text-xs text-neutral-500 truncate max-w-[280px]">
              {locale === 'ar' ? product.name_ar : product.name_en}
            </p>
          </div>
        </div>

        {/* Media Drive Assets */}
        {product.marketingDriveUrl && (
          <div className="mb-5 p-3.5 rounded-lg bg-neutral-50 border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink">
                {locale === 'ar' ? 'ملفات الصور والفيديوهات الإعلانية (بدون علامة مائية)' : 'Ad Creatives Drive'}
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {locale === 'ar' ? 'جاهزة للحملات الإعلانية على مختلف المنصات' : 'Ready for ad campaigns'}
              </p>
            </div>
            <a
              href={product.marketingDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-ink hover:bg-neutral-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download size={13} strokeWidth={1.6} />
              <span>{locale === 'ar' ? 'تحميل' : 'Download'}</span>
            </a>
          </div>
        )}

        {/* Ad Copies List */}
        <div className="space-y-3.5">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            {locale === 'ar' ? 'نماذج نصوص إعلانية جاهزة للنسخ:' : 'Ready-to-use Ad Copies:'}
          </p>

          {copies.map((c, i) => (
            <div key={i} className="border border-border rounded-lg p-3.5 bg-neutral-50/50 hover:bg-white transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-ink">
                  {c.title}
                </span>
                <button
                  onClick={() => handleCopy(c.copy, i)}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                    copiedIndex === i
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-border text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {copiedIndex === i ? (
                    <>
                      <Check size={12} strokeWidth={1.6} />
                      <span>{locale === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} strokeWidth={1.6} />
                      <span>{locale === 'ar' ? 'نسخ النص' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="text-xs text-neutral-700 font-sans whitespace-pre-wrap leading-relaxed bg-white p-2.5 rounded border border-border">
                {c.copy}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
