'use client';

import React, { useState, useRef } from 'react';
import { X, Save, Plus, Trash2, Upload, Image as ImageIcon, Check, Sparkles, RefreshCw } from 'lucide-react';
import type { Product } from '@/lib/types';
import { saveProduct } from '@/lib/dataService';

interface ProductFormModalProps {
  product?: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

// Preset store images for quick selection
const PRESET_HOODIE_IMAGES = [
  { label: 'Broken Planet', url: '/products/06f6580b-e809-4fb1-a16b-b668d10ab5a8.jfif' },
  { label: 'Speed Thrills', url: '/products/89e578c7-43ca-4f51-b883-9c8e10d2a84e.jfif' },
  { label: 'Lost Soul', url: '/products/808bb39a-cf2a-43cf-ae17-88f1dc852467.jfif' },
  { label: 'Calligraphy', url: '/products/3bdc26c0-9566-444e-bdb5-e697b2a78c52.jfif' },
  { label: 'Sincal Star', url: '/products/3cb61a1d-a9bd-4175-85d6-73de64103cd0.jfif' },
  { label: 'Cyber Ninja', url: '/products/9440ea29-231a-4ee2-a178-e505296e6a1d.jfif' },
];

export default function ProductFormModal({
  product,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const [nameAr, setNameAr] = useState(product?.name_ar || '');
  const [nameEn, setNameEn] = useState(product?.name_en || '');
  const [brand, setBrand] = useState(product?.brand || 'Ctrl YZ');
  const [category, setCategory] = useState(product?.category || 'Hoodies');

  const [costPrice, setCostPrice] = useState<number>(product?.costPrice || 260);
  const [wholesalePrice, setWholesalePrice] = useState<number>(product?.wholesalePrice || 370);
  const [suggestedPrice, setSuggestedPrice] = useState<number>(product?.suggestedPrice || 590);
  const [minPrice, setMinPrice] = useState<number>(product?.minPrice || 510);
  const [salePrice, setSalePrice] = useState<number | undefined>(product?.salePrice);
  const [stock, setStock] = useState<number>(product?.stock || 80);

  const [descriptionAr, setDescriptionAr] = useState(
    product?.description_ar ||
      'هودي أوفر سايز قطن مصري 100% ميلتون ثقيل 420 جرام، مبطن بوبرة دافئة مع طباعة ثابتة ضد الغسيل ومعاينة كاملة قبل الاستلام.'
  );
  const [descriptionEn, setDescriptionEn] = useState(product?.description_en || '');
  const [imageUrl, setImageUrl] = useState(product?.images?.[0] || PRESET_HOODIE_IMAGES[0].url);
  const [marketingDriveUrl, setMarketingDriveUrl] = useState(product?.marketingDriveUrl || '');
  const [sizesStr, setSizesStr] = useState(product?.sizes ? product.sizes.join(', ') : 'M, L, XL, 2XL, 3XL');
  const [colorsStr, setColorsStr] = useState(
    product?.colors ? product.colors.map((c) => c.name).join(', ') : 'Jet Black, Heavy Grey, Navy'
  );
  const [adCopyText, setAdCopyText] = useState(
    product?.adCopies?.[0]?.copy ||
      'كولكشن الشتاء الرسمي! هودي أوفر سايز قطن 420 GSM فاخر مع معاينة كاملة قبل الدفع وشحن سريع لجميع المحافظات.'
  );

  const [isActive, setIsActive] = useState(product ? product.isActive : true);
  const [isFeatured, setIsFeatured] = useState(product ? Boolean(product.isFeatured) : true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const calculatedCommission = Math.max(0, suggestedPrice - wholesalePrice);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('فشل رفع الصورة');
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !wholesalePrice || !suggestedPrice) {
      setError('يرجى ملء اسم المنتج بالعربية وأسعار الجملة والبيع المقترح');
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
        salePrice: salePrice ? Number(salePrice) : undefined,
        commission: calculatedCommission,
        stock: Number(stock),
        description_ar: descriptionAr.trim(),
        description_en: descriptionEn.trim() || descriptionAr.trim(),
        images: imageUrl.trim() ? [imageUrl.trim()] : [PRESET_HOODIE_IMAGES[0].url],
        marketingDriveUrl: marketingDriveUrl.trim() || undefined,
        adCopies: adCopyText.trim()
          ? [{ title: 'إعلان فيسبوك وتيك توك', copy: adCopyText.trim() }]
          : undefined,
        sizes: sizes.length > 0 ? sizes : ['M', 'L', 'XL', '2XL'],
        colors: colors.length > 0 ? colors : [{ name: 'Default', hex: '#111827' }],
        isActive,
        isFeatured,
      };

      const saved = await saveProduct(payload);
      onSaved(saved);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'حدث خطأ أثناء حفظ ومزامنة المنتج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs select-none">
      <div
        dir="rtl"
        className="bg-white rounded-2xl w-full max-w-2xl p-6 sm:p-8 border border-border shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-5"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
        >
          <X size={16} strokeWidth={1.8} />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_8px_#0258ED] animate-pulse" />
            <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
              إدارة كتالوج المنتجات
            </span>
          </div>
          <h3 className="text-lg font-bold text-ink">
            {product ? `تعديل المنتج: ${product.name_ar}` : 'إضافة ورفع منتج جديد للكتالوج'}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            يتم حفظ المنتج ومزامنته فورياً مع جميع الأجهزة (المتجر، بوابة المسوقين، ولوحة الأدمن)
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-800 text-xs font-medium border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-neutral-700">
          {/* IMAGE UPLOAD & GALLERY SECTION */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-border space-y-3">
            <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
              صورة المنتج الرئيسية
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Image Preview Box */}
              <div className="w-24 h-32 rounded-xl bg-zinc-950 border border-border overflow-hidden flex items-center justify-center flex-shrink-0 relative group shadow-subtle">
                {imageUrl ? (
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon size={28} className="text-neutral-500" />
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-[10px]">
                    <RefreshCw size={16} className="animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="px-3.5 py-2 rounded-lg bg-ink text-white font-bold text-xs flex items-center gap-1.5 hover:bg-neutral-800 transition"
                  >
                    <Upload size={14} />
                    <span>{uploadingImage ? 'جاري الرفع...' : 'رفع صورة من جهازك'}</span>
                  </button>

                  <span className="text-[11px] text-neutral-400">يدعم JPG, PNG, WebP</span>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="أو أدخل رابط الصورة مباشرة هنا..."
                    className="w-full px-3 py-1.5 rounded-lg border border-border text-xs font-mono font-normal focus:outline-none focus:border-brand bg-white"
                  />
                </div>

                {/* Preset image selector */}
                <div>
                  <span className="text-[10px] text-neutral-400 block mb-1">
                    أو اختر صورة جاهزة بنقرة واحدة:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {PRESET_HOODIE_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className={`w-8 h-10 rounded-md border overflow-hidden flex-shrink-0 transition ${
                          imageUrl === preset.url ? 'ring-2 ring-brand border-brand' : 'opacity-70 hover:opacity-100 border-border'
                        }`}
                        title={preset.label}
                      >
                        <img src={preset.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Titles & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block mb-1 text-ink">اسم المنتج بالعربية *</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="هودي أوفر سايز كولكشن الشتاء"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-brand font-normal text-ink"
              />
            </div>
            <div>
              <label className="block mb-1 text-ink">اسم المنتج بالإنجليزية (اختياري)</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Ctrl YZ Heavyweight Oversized Hoodie"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-brand font-normal text-ink"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block mb-1 text-ink">العلامة التجارية (البراند)</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-brand font-normal text-ink"
              />
            </div>
            <div>
              <label className="block mb-1 text-ink">التصنيف (Category)</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Hoodies, Streetwear, Arabic Calligraphy..."
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-brand font-normal text-ink"
              />
            </div>
          </div>

          {/* Pricing & Commissions Structure */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-border space-y-3">
            <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
              هيكل التسعير وحساب عمولة المسوق
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block mb-1 text-[11px] text-neutral-600">تكلفة المنصة (ج.م)</label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border border-border text-xs font-mono num-tabular font-normal focus:outline-none focus:border-brand bg-white text-ink"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] text-neutral-600">جملة المسوق (ج.م) *</label>
                <input
                  type="number"
                  required
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border border-border text-xs font-mono num-tabular font-bold focus:outline-none focus:border-brand bg-white text-ink"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] text-neutral-600">سعر البيع المقترح *</label>
                <input
                  type="number"
                  required
                  value={suggestedPrice}
                  onChange={(e) => setSuggestedPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border border-border text-xs font-mono num-tabular font-bold focus:outline-none focus:border-brand bg-white text-ink"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] text-neutral-600">الحد الأدنى للبيع</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border border-border text-xs font-mono num-tabular font-normal focus:outline-none focus:border-brand bg-white text-ink"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
              <span className="text-neutral-600">عمولة المسوق المحسوبة تلقائياً على كل قطعة:</span>
              <span className="font-bold text-emerald-700 font-mono num-tabular text-sm">+{calculatedCommission} ج.م</span>
            </div>
          </div>

          {/* Stock, Sizes, Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 text-ink">المخزون المتوفر بالقطع *</label>
              <input
                type="number"
                required
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular font-normal focus:outline-none focus:border-brand text-ink"
              />
            </div>
            <div>
              <label className="block mb-1 text-ink">المقاسات (مفصولة بفاصلة)</label>
              <input
                type="text"
                value={sizesStr}
                onChange={(e) => setSizesStr(e.target.value)}
                placeholder="M, L, XL, 2XL, 3XL"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-normal focus:outline-none focus:border-brand text-ink"
              />
            </div>
            <div>
              <label className="block mb-1 text-ink">الألوان المتاحة</label>
              <input
                type="text"
                value={colorsStr}
                onChange={(e) => setColorsStr(e.target.value)}
                placeholder="Black, Grey, Navy"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-normal focus:outline-none focus:border-brand text-ink"
              />
            </div>
          </div>

          {/* Marketing Drive Link */}
          <div>
            <label className="block mb-1 text-ink">رابط مجلد Google Drive (الصور الإعلانية والفيديوهات للمسوقين)</label>
            <input
              type="url"
              value={marketingDriveUrl}
              onChange={(e) => setMarketingDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono font-normal focus:outline-none focus:border-brand text-ink"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1 text-ink">وصف المنتج ومواصفات الخامة</label>
            <textarea
              rows={2}
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs font-normal focus:outline-none focus:border-brand resize-none text-ink"
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-border text-brand focus:ring-brand"
              />
              <span className="text-xs text-ink">متاح للبيع بالكتالوج (Active)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-border text-brand focus:ring-brand"
              />
              <span className="text-xs text-ink">مميز في المتجر (Featured)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="flex-1 py-2.5 rounded-xl bg-ink text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Save size={14} strokeWidth={1.8} />
              <span>{loading ? 'جاري الحفظ والمزامنة...' : 'حفظ ومزامنة المنتج فورياً'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
