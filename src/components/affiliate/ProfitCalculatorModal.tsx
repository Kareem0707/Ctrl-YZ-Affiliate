'use client';

import React, { useState } from 'react';
import { X, Calculator, Check, TrendingUp, AlertCircle } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfitCalculatorModalProps {
  product: Product;
  onClose: () => void;
  onUsePrice?: (customPrice: number) => void;
}

export default function ProfitCalculatorModal({
  product,
  onClose,
  onUsePrice,
}: ProfitCalculatorModalProps) {
  const { locale } = useLanguage();
  const [sellingPrice, setSellingPrice] = useState<number>(product.suggestedPrice);
  const [quantity, setQuantity] = useState<number>(1);

  const wholesale = product.wholesalePrice;
  const profitPerItem = Math.max(0, sellingPrice - wholesale);
  const totalProfit = profitPerItem * quantity;
  const isBelowMin = sellingPrice < product.minPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl w-full max-w-md p-6 border border-border shadow-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
        >
          <X size={16} strokeWidth={1.6} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 text-ink flex items-center justify-center">
            <Calculator size={20} strokeWidth={1.6} />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">
              {locale === 'ar' ? 'حاسبة أرباح المسوق' : 'Profit Calculator'}
            </h3>
            <p className="text-xs text-neutral-500 truncate max-w-[240px]">
              {locale === 'ar' ? product.name_ar : product.name_en}
            </p>
          </div>
        </div>

        {/* Pricing Specs */}
        <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3.5 rounded-lg border border-border mb-4 text-xs">
          <div>
            <span className="text-neutral-500 block text-[11px]">{locale === 'ar' ? 'سعر الجملة عليك:' : 'Wholesale Cost:'}</span>
            <span className="text-sm font-bold text-ink font-mono num-tabular">{wholesale} ج.م</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[11px]">{locale === 'ar' ? 'أقل سعر بيع مسموح:' : 'Min Allowed Price:'}</span>
            <span className="text-sm font-bold text-ink font-mono num-tabular">{product.minPrice} ج.م</span>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3.5 mb-5">
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">
              {locale === 'ar' ? 'حدد سعر البيع للعميل (ج.م):' : 'Selling Price to Customer:'}
            </label>
            <div className="relative">
              <input
                type="number"
                min={product.minPrice}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className={`w-full px-3.5 py-2 rounded-lg border text-sm font-semibold focus:outline-none transition-colors num-tabular ${
                  isBelowMin ? 'border-red-400 bg-red-50 text-red-700' : 'border-border bg-white focus:border-ink text-ink'
                }`}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400">
                ج.م
              </span>
            </div>
            {isBelowMin && (
              <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                <AlertCircle size={12} strokeWidth={1.6} />
                <span>{locale === 'ar' ? `أقل سعر للبيع هو ${product.minPrice} ج.م` : `Min price is ${product.minPrice} EGP`}</span>
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">
              {locale === 'ar' ? 'الكمية المطلوبة للعميل:' : 'Quantity:'}
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantity(q)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors num-tabular ${
                    quantity === q
                      ? 'bg-ink text-white border-ink font-semibold'
                      : 'bg-white text-neutral-700 border-border hover:bg-neutral-50'
                  }`}
                >
                  {q} {locale === 'ar' ? 'قطع' : 'pcs'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculation Output Box */}
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg mb-5 text-emerald-900">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-emerald-800 flex items-center gap-1">
              <TrendingUp size={13} strokeWidth={1.6} />
              <span>{locale === 'ar' ? 'ربحك الصافي المتوقع:' : 'Net Profit:'}</span>
            </span>
            <span className="text-xs bg-emerald-100 font-bold px-2 py-0.5 rounded text-emerald-800 num-tabular">
              {profitPerItem} ج.م / قطعة
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700 num-tabular">
            +{totalProfit} <span className="text-xs font-arabic font-normal text-emerald-800">ج.م صافي</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-2 border-t border-emerald-200 pt-2 num-tabular">
            {locale === 'ar'
              ? `إجمالي قيمة الطلب للعميل: ${sellingPrice * quantity} ج.م + مصاريف الشحن`
              : `Total customer charge: ${sellingPrice * quantity} EGP + shipping`}
          </p>
        </div>

        {onUsePrice && (
          <button
            onClick={() => {
              if (!isBelowMin) {
                onUsePrice(sellingPrice);
                onClose();
              }
            }}
            disabled={isBelowMin}
            className="w-full py-2.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={14} strokeWidth={1.6} />
            <span>{locale === 'ar' ? 'اعتماد هذا السعر في الطلب' : 'Apply Price to Order'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
