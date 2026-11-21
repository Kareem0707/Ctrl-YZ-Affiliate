'use client';

import React, { useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import { saveProduct } from '@/lib/dataService';

interface ProductFormModalProps {
  product?: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

export default function ProductFormModal({
  product,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const [nameAr, setNameAr] = useState(product?.name_ar || '');
  const [nameEn, setNameEn] = useState(product?.name_en || '');
  const [brand, setBrand] = useState(product?.brand || 'Ctrl YZ');
  const [category, setCategory] = useState(product?.category || 'Hoodies');

  const [costPrice, setCostPrice] = useState<number>(product?.costPrice || 200);
  const [wholesalePrice, setWholesalePrice] = useState<number>(product?.wholesalePrice || 320);
  const [suggestedPrice, setSuggestedPrice] = useState<number>(product?.suggestedPrice || 550);
  const [minPrice, setMinPrice] = useState<number>(product?.minPrice || 480);
  const [stock, setStock] = useState<number>(product?.stock || 50);

  const [descriptionAr, setDescriptionAr] = useState(product?.description_ar || '');
  const [descriptionEn, setDescriptionEn] = useState(product?.description_en || '');
  const [imageUrl, setImageUrl] = useState(product?.images?.[0] || '');
  const [marketingDriveUrl, setMarketingDriveUrl] = useState(product?.marketingDriveUrl || '');
  const [sizesStr, setSizesStr] = useState(product?.sizes ? product.sizes.join(', ') : 'M, L, XL, 2XL');
  const [colorsStr, setColorsStr] = useState(
    product?.colors ? product.colors.map((c) => c.name).join(', ') : 'Black, Navy, Beige'
  );
  const [adCopyText, setAdCopyText] = useState(
    product?.adCopies?.[0]?.copy || 'عرض خاص ومميز لفترة محدودة! خامات قطنية ممتازة وشحن لجميع المحافظات والدفع عند الاستلام.'
  );

  const [isActive, setIsActive] = useState(product ? product.isActive : true);
  const [isFeatured, setIsFeatured] = useState(product ? Boolean(product.isFeatured) : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatedCommission = Math.max(0, suggestedPrice - wholesalePrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !wholesalePrice || !suggestedPrice) {
      setError('يرجى ملء اسم المنتج وأسعار الجملة والبيع المقترح');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sizes = sizesStr.split(',').map((s) => s.trim()).filter(Boolean);
      const colors = colorsStr.split(',').map((c) => c.trim()).filter(Boolean).map((name) => ({
        name,
        hex: '#111827',
      }));

      const payload: Partial<Product> = {
        id: product?.id,
        name_ar: nameAr.trim(),
        name_en: nameEn.trim() || nameAr.trim(),
        brand: brand.trim(),
        category: category.trim(),
        costPrice: Number(costPrice),
        wholesalePrice: Number(wholesalePrice),
        suggestedPrice: Number(suggestedPrice),
        minPrice: Number(minPrice),
        price: Number(suggestedPrice),
        commission: calculatedCommission,
        stock: Number(stock),
        description_ar: descriptionAr.trim(),
        description_en: descriptionEn.trim() || descriptionAr.trim(),
        images: imageUrl.trim() ? [imageUrl.trim()] : ['/products/06f6580b-e809-4fb1-a16b-b668d10ab5a8.jfif'],
        marketingDriveUrl: marketingDriveUrl.trim() || undefined,
        adCopies: adCopyText.trim()
          ? [{ title: 'إعلان فيسبوك وتيك توك', copy: adCopyText.trim() }]
          : undefined,
        sizes: sizes.length > 0 ? sizes : ['Standard'],
        colors: colors.length > 0 ? colors : [{ name: 'Default', hex: '#000000' }],
        isActive,
        isFeatured,
      };

      const saved = await saveProduct(payload);
      onSaved(saved);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'حدث خطأ أثناء حفظ المنتج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 border border-border shadow-md relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
        >
          <X size={16} strokeWidth={1.6} />
        </button>

        <h3 className="text-base font-bold text-ink mb-1">
          {product ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمنصة'}
        </h3>
        <p className="text-xs text-neutral-500 mb-5">
          سيظهر هذا المنتج في كتالوج المسوقين بالأسعار والعمولات المحددة
        </p>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-neutral-700">
          {/* Titles & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block mb-1">اسم المنتج بالعربية *</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="سويت شيرت هودي أوفر سايز"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
              />
            </div>
            <div>
              <label className="block mb-1">اسم المنتج بالإنجليزية (اختياري)</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Ctrl YZ Heavyweight Hoodie"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block mb-1">البراند / العلامة التجارية</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
              />
            </div>
            <div>
              <label className="block mb-1">التصنيف / الفئة</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Hoodies, Footwear, Pants..."
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
              />
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="p-3.5 bg-neutral-50 rounded-lg border border-border space-y-3">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              هيكل التسعير وحساب العمولات
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block mb-1 text-[11px]">تكلفة المنصة (ج.م)</label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border border-border text-xs font-mono num-tabular font-normal focus:outline-none focus:border-ink bg-white"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px]">جملة المسوق (ج.م) *</label>
                <input
                  type="number"
                  required
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border border-border text-xs font-mono num-tabular font-bold focus:outline-none focus:border-ink bg-white"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px]">سعر البيع المقترح *</label>
                <input
                  type="number"
                  required
                  value={suggestedPrice}
                  onChange={(e) => setSuggestedPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border border-border text-xs font-mono num-tabular font-bold focus:outline-none focus:border-ink bg-white"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px]">الحد الأدنى للبيع</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border border-border text-xs font-mono num-tabular font-normal focus:outline-none focus:border-ink bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
              <span className="text-neutral-500">عمولة المسوق المحسوبة تلقائياً:</span>
              <span className="font-bold text-emerald-700 font-mono num-tabular">+{calculatedCommission} ج.م</span>
            </div>
          </div>

          {/* Stock, Sizes, Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1">المخزون المتوفر *</label>
              <input
                type="number"
                required
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular font-normal focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block mb-1">المقاسات (مفصولة بفاصلة)</label>
              <input
                type="text"
                value={sizesStr}
                onChange={(e) => setSizesStr(e.target.value)}
                placeholder="M, L, XL, 2XL"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-normal focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block mb-1">الألوان (مفصولة بفاصلة)</label>
              <input
                type="text"
                value={colorsStr}
                onChange={(e) => setColorsStr(e.target.value)}
                placeholder="Black, Navy, Grey"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-normal focus:outline-none focus:border-ink"
              />
            </div>
          </div>

          {/* Image & Drive */}
          <div>
            <label className="block mb-1">رابط صورة المنتج (URL)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/products/... أو رابط صورة خارجي"
              className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular font-normal focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block mb-1">رابط جوجل درايف للمواد التسويقية والفيديوهات</label>
            <input
              type="url"
              value={marketingDriveUrl}
              onChange={(e) => setMarketingDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular font-normal focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block mb-1">وصف المنتج بالعربية</label>
            <textarea
              rows={2}
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              placeholder="وصف تفصيلي للخامة والتصميم..."
              className="w-full px-3 py-2 rounded-lg border border-border text-xs font-normal focus:outline-none focus:border-ink resize-none"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-xs">متاح للبيع بالكتالوج</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-xs">مميز في المتجر (Featured)</span>
            </label>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border text-neutral-700 text-xs font-medium hover:bg-neutral-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Save size={14} strokeWidth={1.6} />
              <span>{loading ? 'جاري الحفظ...' : 'حفظ المنتج'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
