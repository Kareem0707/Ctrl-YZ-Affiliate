'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  PackagePlus,
  Truck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  User,
  Phone,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import type { Product, Order, Marketer } from '@/lib/types';
import { createOrder } from '@/lib/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';

interface CreateOrderFormProps {
  products: Product[];
  marketer?: Marketer | null;
  preSelectedProduct?: Product | null;
  onOrderSuccess?: (newOrder: Order) => void;
}

export default function CreateOrderForm({
  products,
  marketer,
  preSelectedProduct,
  onOrderSuccess,
}: CreateOrderFormProps) {
  const { currentMarketer: authMarketer } = useAuth();
  const activeMarketer = marketer ?? authMarketer;
  const { locale } = useLanguage();
  const { shippingRates: governorates, currencySymbol } = useSettings();

  // Only show active, in-stock products
  const availableProducts = useMemo(
    () => products.filter((p) => p.isActive && p.stock > 0),
    [products]
  );

  const [selectedProductId, setSelectedProductId] = useState<string>(
    preSelectedProduct && preSelectedProduct.stock > 0
      ? preSelectedProduct.id
      : availableProducts[0]?.id || ''
  );
  const [selectedSize, setSelectedSize] = useState<string>('L');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<number>(590);

  const [selectedGovId, setSelectedGovId] = useState<string>('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preSelectedId = preSelectedProduct?.id;
  const preSelectedActive = preSelectedProduct?.isActive;
  const preSelectedStock = preSelectedProduct?.stock ?? 0;

  // Keep selectedProductId valid if preSelectedProduct changes
  useEffect(() => {
    if (preSelectedId && preSelectedActive && preSelectedStock > 0) {
      setSelectedProductId(preSelectedId);
    }
  }, [preSelectedId, preSelectedActive, preSelectedStock]);

  // Select first available product only if current selection is empty/invalid
  useEffect(() => {
    if (
      availableProducts.length > 0 &&
      !availableProducts.some((p) => p.id === selectedProductId)
    ) {
      setSelectedProductId(availableProducts[0].id);
    }
  }, [availableProducts, selectedProductId]);

  const activeProduct =
    availableProducts.find((p) => p.id === selectedProductId) || availableProducts[0] || null;
  const activeProductId = activeProduct?.id;

  // CRITICAL: depend ONLY on activeProduct?.id so background sync NEVER resets user inputs while typing!
  useEffect(() => {
    if (!activeProduct) return;
    setCustomPrice(activeProduct.suggestedPrice);
    const firstInStockVariant = activeProduct.variants?.find((v) => v.isActive && v.stock > 0);
    setSelectedSize(firstInStockVariant?.size || activeProduct.sizes?.[0] || 'M');
    setSelectedColor(firstInStockVariant?.color || activeProduct.colors?.[0]?.name || '');
    setQuantity(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProductId]);

  // Resolve exact variant & variant stock
  const matchedVariant = useMemo(() => {
    if (!activeProduct?.variants || activeProduct.variants.length === 0) return null;
    const exact = activeProduct.variants.find(
      (v) =>
        v.isActive &&
        v.size.toLowerCase() === selectedSize.toLowerCase() &&
        (!selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase())
    );
    if (exact) return exact;
    return (
      activeProduct.variants.find(
        (v) => v.isActive && v.size.toLowerCase() === selectedSize.toLowerCase()
      ) ?? null
    );
  }, [activeProduct?.variants, selectedSize, selectedColor]);

  const variantStock = matchedVariant ? matchedVariant.stock : activeProduct?.stock ?? 0;

  // Clamp quantity whenever selected variant changes
  useEffect(() => {
    if (variantStock > 0 && quantity > variantStock) {
      setQuantity(variantStock);
    }
  }, [variantStock, quantity]);

  useEffect(() => {
    if (governorates.length > 0 && !governorates.some((g) => g.id === selectedGovId)) {
      setSelectedGovId(governorates[0].id);
    }
  }, [governorates, selectedGovId]);

  const currentGov = governorates.find((g) => g.id === selectedGovId) || governorates[0];
  const shippingFee = currentGov ? currentGov.fee : 45;

  const wholesale = activeProduct ? activeProduct.wholesalePrice : 300;
  const minPrice = activeProduct ? activeProduct.minPrice : 400;
  const isBelowMin = customPrice < minPrice;

  const profitPerItem = Math.max(0, customPrice - wholesale);
  const totalCommission = profitPerItem * quantity;
  const productsSubtotal = customPrice * quantity;
  const totalCODToCollect = productsSubtotal + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMarketer) {
      setError('يجب تسجيل الدخول بحساب مسوق معتمد ونشط لتسجيل الطلبات');
      return;
    }
    if (!activeProduct || variantStock <= 0) {
      setError('المنتج أو المقاس/اللون المحدد غير متوفر حالياً في المخزون');
      return;
    }
    if (isBelowMin) {
      setError(`سعر البيع لا يمكن أن يقل عن ${minPrice} ${currencySymbol}`);
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setError('يرجى ملء جميع الحقول الإلزامية الخاصة بالعميل');
      return;
    }

    const safeQty = Math.min(variantStock, Math.max(1, Math.floor(quantity)));

    setLoading(true);
    setError(null);

    try {
      const orderPayload = {
        source: 'AFFILIATE_DIRECT' as const,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAltPhone: customerPhone2.trim() || undefined,
        governorate: currentGov ? currentGov.governorate_ar : 'القاهرة',
        customerCity: customerCity.trim() || (currentGov ? currentGov.governorate_ar : 'القاهرة'),
        customerAddress: customerAddress.trim(),
        notes: notes.trim() || undefined,
        items: [
          {
            productId: activeProduct.id,
            variantId: matchedVariant?.id,
            size: selectedSize,
            color: selectedColor,
            quantity: safeQty,
            customUnitPrice: customPrice,
          },
        ],
      };

      const newOrder = await createOrder(orderPayload);
      setPlacedOrder(newOrder);
      if (onOrderSuccess) onOrderSuccess(newOrder);

      // Reset form fields
      setCustomerName('');
      setCustomerPhone('');
      setCustomerPhone2('');
      setCustomerCity('');
      setCustomerAddress('');
      setNotes('');
    } catch (err: any) {
      console.error('Error submitting affiliate order:', err);
      setError(err?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="bg-white rounded-xl p-8 border border-border shadow-xs text-center max-w-lg mx-auto my-6">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
          <CheckCircle2 size={32} strokeWidth={1.6} />
        </div>
        <h3 className="text-xl font-bold text-ink mb-1">
          {locale === 'ar' ? 'تم تسجيل الطلب وإرساله لمركز العمليات بنجاح' : 'Order Placed & Sent to Operations'}
        </h3>
        <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
          {locale === 'ar'
            ? 'سيقوم فريق التأكيد بمراجعة بيانات العميل هاتفياً وتجهيز الشحنة فوراً'
            : 'Our operations team will confirm with the customer and dispatch the shipment'}
        </p>

        <div className="bg-neutral-50 rounded-lg p-4 border border-border text-right space-y-2 mb-6">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <span className="text-xs text-neutral-500">{locale === 'ar' ? 'رقم الطلب:' : 'Order Number:'}</span>
            <span className="text-sm font-bold text-ink font-mono num-tabular">{placedOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-500">{locale === 'ar' ? 'اسم العميل:' : 'Customer Name:'}</span>
            <span className="text-xs font-semibold text-ink">{placedOrder.customerName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-500">{locale === 'ar' ? 'المبلغ المطلوب تحصيله (COD):' : 'COD Amount:'}</span>
            <span className="text-xs font-bold font-mono text-ink num-tabular">{placedOrder.totalAmount} ج.م</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border text-emerald-700 font-medium">
            <span className="text-xs">{locale === 'ar' ? 'أرباحك المضافة للرصيد المعلق:' : 'Commission Added to Pending:'}</span>
            <span className="text-sm font-bold font-mono num-tabular">+{placedOrder.affiliateCommission} ج.م</span>
          </div>
        </div>

        <button
          onClick={() => setPlacedOrder(null)}
          className="w-full py-2.5 bg-ink text-white font-medium text-xs rounded-lg hover:bg-neutral-800 transition-colors"
        >
          {locale === 'ar' ? 'تسجيل طلب جديد لعميل آخر' : 'Create Another Order'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 sm:p-7 border border-border">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 text-ink flex items-center justify-center">
          <PackagePlus size={20} strokeWidth={1.6} />
        </div>
        <div>
          <h2 className="text-base font-bold text-ink">
            {locale === 'ar' ? 'تسجيل طلب جديد لعميلك (شحن وتحصيل كاش)' : 'Create Direct Order for Customer'}
          </h2>
          <p className="text-xs text-neutral-500">
            {locale === 'ar'
              ? 'سجل بيانات عميلك وسنقوم بالتجهيز والشحن وتحصيل الفلوس وإيداع عمولتك تلقائياً'
              : 'Submit customer order; we handle logistics, COD collection & profit distribution'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={15} strokeWidth={1.6} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Product & Pricing Selection */}
        <div className="bg-neutral-50 p-4 sm:p-5 rounded-lg border border-border space-y-4">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            {locale === 'ar' ? 'الخطوة 1: اختيار المنتج وتحديد سعر البيع' : 'Step 1: Product & Pricing'}
          </span>

          {/* Select Product */}
          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">
              {locale === 'ar' ? 'اختر المنتج من الكتالوج:' : 'Select Product:'}
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={availableProducts.length === 0}
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-border text-xs font-semibold text-ink focus:outline-none focus:border-ink disabled:opacity-60"
            >
              {availableProducts.length === 0 ? (
                <option value="">لا توجد منتجات متوفرة حالياً في المخزن</option>
              ) : (
                availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_ar} (متاح: {p.stock} | جملة: {p.wholesalePrice} {currencySymbol} | عمولة: {p.commission} {currencySymbol})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Product Options: Size, Color, Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                {locale === 'ar' ? 'المقاس:' : 'Size:'}
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-border text-xs font-medium focus:outline-none focus:border-ink"
              >
                {activeProduct?.sizes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                {locale === 'ar' ? 'اللون:' : 'Color:'}
              </label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-border text-xs font-medium focus:outline-none focus:border-ink"
              >
                {activeProduct?.colors.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                {locale === 'ar' ? 'الكمية:' : 'Quantity:'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, variantStock)}
                  disabled={variantStock <= 0}
                  value={quantity}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    if (Number.isNaN(parsed)) {
                      setQuantity(1);
                    } else {
                      setQuantity(Math.min(Math.max(1, variantStock), Math.max(1, parsed)));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-border text-xs font-semibold focus:outline-none focus:border-ink text-center num-tabular disabled:opacity-50"
                />
                <span
                  className={`text-[11px] whitespace-nowrap font-medium ${
                    variantStock <= 0 ? 'text-rose-600' : 'text-neutral-500'
                  }`}
                >
                  {variantStock <= 0 ? '(نفد هذا المقاس)' : `(متاح ${variantStock})`}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Selling Price */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-ink">
                {locale === 'ar' ? 'حدد سعر البيع للعميل للقطعة الواحدة (ج.م):' : 'Selling Price to Customer (EGP):'}
              </label>
              <span className="text-[11px] text-neutral-500 num-tabular">
                {locale === 'ar' ? `سعر الجملة عليك: ${wholesale} ج.م` : `Wholesale: ${wholesale} EGP`}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={minPrice}
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className={`w-full px-3.5 py-2 rounded-lg border text-xs font-semibold focus:outline-none transition-colors num-tabular ${
                  isBelowMin ? 'border-red-400 bg-red-50 text-red-700' : 'border-border bg-white focus:border-ink text-ink'
                }`}
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400">
                ج.م
              </span>
            </div>
            {isBelowMin ? (
              <p className="text-[11px] text-red-600 mt-1 font-medium">
                تنبيه: أقل سعر بيع مسموح به لهذا المنتج هو {minPrice} ج.م
              </p>
            ) : (
              <p className="text-[11px] text-emerald-700 mt-1 font-medium num-tabular">
                صافي ربحك من كل قطعة: {profitPerItem} ج.م (إجمالي الربح: {totalCommission} ج.م)
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Customer Delivery Details */}
        <div className="space-y-4">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            {locale === 'ar' ? 'الخطوة 2: بيانات العميل وعنوان الشحن' : 'Step 2: Customer Delivery Details'}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                {locale === 'ar' ? 'اسم العميل ثلاثي *' : 'Customer Full Name *'}
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={locale === 'ar' ? 'محمد السيد إبراهيم' : 'Full Name'}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                {locale === 'ar' ? 'رقم الهاتف الأساسي *' : 'Primary Phone *'}
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                {locale === 'ar' ? 'رقم هاتف بديل (اختياري)' : 'Secondary Phone (Optional)'}
              </label>
              <input
                type="tel"
                value={customerPhone2}
                onChange={(e) => setCustomerPhone2(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                {locale === 'ar' ? 'المحافظة *' : 'Governorate *'}
              </label>
              <select
                value={selectedGovId}
                onChange={(e) => setSelectedGovId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-medium focus:outline-none focus:border-ink"
              >
                {governorates.map((gov) => (
                  <option key={gov.id} value={gov.id}>
                    {locale === 'ar' ? gov.governorate_ar : gov.governorate_en} - (شحن: {gov.fee} {currencySymbol} | {gov.deliveryTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">
              {locale === 'ar' ? 'المدينة / المنطقة *' : 'City / Area *'}
            </label>
            <input
              type="text"
              required
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
              placeholder={locale === 'ar' ? 'المعادي / مدينة نصر / الدقي' : 'Area name'}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">
              {locale === 'ar' ? 'العنوان بالتفصيل (اسم الشارع، رقم العقار، الدور، الشقة) *' : 'Detailed Address *'}
            </label>
            <textarea
              required
              rows={2}
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder={locale === 'ar' ? 'شارع النصر، عمارة 15 الدور الثالث شقة 6' : 'Street name, Building, Floor'}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-700 block mb-1">
              {locale === 'ar' ? 'ملاحظات خاصة للمندوب (اختياري)' : 'Notes for Delivery Courier (Optional)'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={locale === 'ar' ? 'معاينة قبل الاستلام / الاتصال قبل الوصول' : 'Call before delivery'}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        {/* Realtime Obsidian Financial Breakdown Card */}
        <div className="bg-ink text-white p-5 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
            <span className="text-xs font-semibold text-neutral-300">
              {locale === 'ar' ? 'ملخص الحسابات المالية للطلب' : 'Financial Breakdown'}
            </span>
            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
              حساب فوري
            </span>
          </div>

          <div className="space-y-2 text-xs text-neutral-400">
            <div className="flex justify-between">
              <span>{locale === 'ar' ? 'سعر المنتجات للعميل:' : 'Customer Products Total:'}</span>
              <span className="font-semibold text-white num-tabular">{productsSubtotal} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>{locale === 'ar' ? `تكلفة الشحن (${currentGov ? currentGov.governorate_ar : ''}):` : 'Shipping Fee:'}</span>
              <span className="font-semibold text-white num-tabular">{shippingFee} ج.م</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-neutral-800 text-sm">
              <span className="font-semibold text-white">{locale === 'ar' ? 'إجمالي التحصيل كاش (COD):' : 'Total Cash to Collect:'}</span>
              <span className="font-bold text-white font-mono num-tabular">{totalCODToCollect} ج.م</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 bg-neutral-900 -mx-2 px-3 py-2.5 rounded-lg flex items-center justify-between text-emerald-400">
            <span className="text-xs font-medium flex items-center gap-1.5 text-neutral-300">
              <TrendingUp size={14} strokeWidth={1.6} className="text-emerald-400" />
              <span>{locale === 'ar' ? 'أرباحك الصافية من هذا الطلب:' : 'Your Net Profit:'}</span>
            </span>
            <span className="text-lg font-bold font-mono text-emerald-400 num-tabular">
              +{totalCommission} ج.م
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || isBelowMin}
          className="w-full py-3 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>{locale === 'ar' ? 'جاري تسجيل الطلب...' : 'Submitting Order...'}</span>
          ) : (
            <>
              <PackagePlus size={16} strokeWidth={1.6} />
              <span>{locale === 'ar' ? 'تأكيد وإرسال الطلب لمركز التجهيز' : 'Submit Order'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
