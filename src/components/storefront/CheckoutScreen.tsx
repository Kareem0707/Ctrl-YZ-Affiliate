'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { createOrder, getShippingRates } from '@/lib/dataService';
import type { GovernorateShipping } from '@/lib/types';

interface CheckoutScreenProps {
  onBack: () => void;
  onOrderPlaced: (orderNumber: string) => void;
  onContinueShopping: () => void;
}

export default function CheckoutScreen({
  onBack,
  onOrderPlaced,
  onContinueShopping,
}: CheckoutScreenProps) {
  const { cart, cartTotal, clearCart } = useCart();
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [governorates, setGovernorates] = useState<GovernorateShipping[]>([]);
  const [selectedGovId, setSelectedGovId] = useState<string>('cairo');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    phone2: '',
    address: '',
    city: '',
    notes: '',
  });

  useEffect(() => {
    getShippingRates().then((rates) => {
      setGovernorates(rates);
      if (rates.length > 0) {
        setSelectedGovId(rates[0].id);
      }
    });
  }, []);

  const currentGov = governorates.find((g) => g.id === selectedGovId) || governorates[0];
  const shippingFee = currentGov ? currentGov.fee : 45;
  const finalTotal = cartTotal + shippingFee;

  const getName = (item: any) => (locale === 'ar' ? item.name_ar || item.name : item.name_en || item.name);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address) return;

    setLoading(true);
    try {
      // Check if user came from an affiliate referral link
      const affiliateRef = typeof window !== 'undefined' ? localStorage.getItem('ctrl_yz_affiliate_ref') : null;

      const orderData = {
        affiliateId: affiliateRef || undefined,
        customerName: form.name,
        customerPhone: form.phone,
        customerPhone2: form.phone2,
        governorate: currentGov ? (locale === 'ar' ? currentGov.governorate_ar : currentGov.governorate_en) : 'القاهرة',
        customerCity: form.city || (currentGov ? currentGov.governorate_ar : 'القاهرة'),
        customerAddress: form.address,
        notes: form.notes,
        shippingFee,
        items: cart.map((item: any) => ({
          productId: item.productId || item.id,
          name: getName(item),
          price: item.price,
          wholesalePrice: Math.round(item.price * 0.65),
          commission: Math.round(item.price * 0.35),
          quantity: item.quantity,
          size: item.size || 'Standard',
          image: item.image || '',
        })),
      };

      const result = await createOrder(orderData);
      const newOrderNum = result.orderNumber;
      setOrderNumber(newOrderNum);
      clearCart();
    } catch (error) {
      console.error('Error placing order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (orderNumber) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 text-center bg-canvas">
        <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 text-emerald-700">
          <CheckCircle2 size={32} strokeWidth={1.6} />
        </div>
        <h1 className="text-xl font-bold text-ink mb-1">
          {locale === 'ar' ? 'تم تأكيد طلبك بنجاح' : 'Order Placed Successfully'}
        </h1>
        <p className="text-xs text-neutral-500 mb-5">
          {locale === 'ar' ? 'سيتواصل معك مندوبنا لتأكيد موعد التسليم' : 'Our team will contact you to confirm delivery'}
        </p>

        <div className="bg-white border border-border rounded-xl p-4 w-full max-w-sm my-3 shadow-xs text-center">
          <p className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider mb-1">
            {locale === 'ar' ? 'رقم الطلب' : 'Order Number'}
          </p>
          <p className="text-xl font-bold text-ink font-mono num-tabular">{orderNumber}</p>
        </div>

        <button
          onClick={() => onOrderPlaced(orderNumber)}
          className="w-full max-w-sm py-2.5 bg-ink text-white font-semibold text-xs rounded-lg mb-2 hover:bg-neutral-800 transition-colors"
        >
          {locale === 'ar' ? 'تتبع مسار شحنتك' : 'Track Your Shipment'}
        </button>
        <button
          onClick={onContinueShopping}
          className="w-full max-w-sm py-2.5 bg-white text-ink font-semibold text-xs rounded-lg border border-border hover:bg-neutral-50 transition-colors"
        >
          {locale === 'ar' ? 'متابعة التسوق' : 'Continue Shopping'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36 bg-canvas">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center gap-3 bg-white border-b border-border">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg bg-neutral-50 border border-border flex items-center justify-center hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={1.6} className="text-neutral-700" />
        </button>
        <h1 className="text-base font-bold text-ink">{t('cart.checkout')}</h1>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-4">
        {/* Order Summary Mini-card */}
        <div className="bg-white rounded-xl p-4 border border-border space-y-2">
          <h2 className="text-xs font-bold text-ink pb-2 border-b border-border">
            {locale === 'ar' ? 'ملخص المنتجات في الطلب' : 'Order Summary'}
          </h2>
          <div className="space-y-1.5 text-xs">
            {cart.map((item: any) => (
              <div key={item.cartId || item.id} className="flex justify-between items-center text-neutral-600">
                <span className="truncate max-w-[200px]">
                  {getName(item)} (×{item.quantity})
                </span>
                <span className="font-mono font-semibold text-ink num-tabular">
                  {((item.salePrice || item.price) * item.quantity).toFixed(2)} ج.م
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center text-neutral-500 pt-1 border-t border-border">
              <span>{locale === 'ar' ? 'تكلفة الشحن:' : 'Shipping:'}</span>
              <span className="font-mono text-ink num-tabular">{shippingFee} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-ink pt-1 border-t border-border">
              <span>{locale === 'ar' ? 'الإجمالي عند الاستلام (COD):' : 'Total (COD):'}</span>
              <span className="font-mono text-ink num-tabular">{finalTotal.toFixed(2)} ج.م</span>
            </div>
          </div>
        </div>

        {/* Shipping Form */}
        <div className="bg-white rounded-xl p-4 border border-border space-y-3">
          <h2 className="text-xs font-bold text-ink pb-2 border-b border-border">
            {locale === 'ar' ? 'عنوان وبيانات استلام الشحنة' : 'Delivery Details'}
          </h2>

          <div className="space-y-3 text-xs font-medium text-neutral-700">
            <div>
              <label className="block mb-1">
                {locale === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={locale === 'ar' ? 'أحمد محمد علي' : 'Full Name'}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
              />
            </div>

            <div>
              <label className="block mb-1">
                {locale === 'ar' ? 'رقم الهاتف الأساسي *' : 'Phone Number *'}
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink font-normal"
              />
            </div>

            <div>
              <label className="block mb-1">
                {locale === 'ar' ? 'رقم هاتف بديل (اختياري)' : 'Secondary Phone (Optional)'}
              </label>
              <input
                type="tel"
                value={form.phone2}
                onChange={(e) => handleChange('phone2', e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink font-normal"
              />
            </div>

            <div>
              <label className="block mb-1">
                {locale === 'ar' ? 'المحافظة *' : 'Governorate *'}
              </label>
              <select
                value={selectedGovId}
                onChange={(e) => setSelectedGovId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs font-semibold focus:outline-none focus:border-ink"
              >
                {governorates.map((gov) => (
                  <option key={gov.id} value={gov.id}>
                    {locale === 'ar' ? gov.governorate_ar : gov.governorate_en} - ({gov.fee} ج.م | {gov.deliveryTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">
                {locale === 'ar' ? 'المدينة / المنطقة *' : 'City / Area *'}
              </label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder={locale === 'ar' ? 'المعادي / مدينة نصر' : 'Area name'}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
              />
            </div>

            <div>
              <label className="block mb-1">
                {locale === 'ar' ? 'العنوان بالتفصيل *' : 'Detailed Address *'}
              </label>
              <textarea
                required
                rows={2}
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder={locale === 'ar' ? 'اسم الشارع، رقم العمارة، الدور، الشقة' : 'Street name, Building, Floor'}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink resize-none font-normal"
              />
            </div>

            <div>
              <label className="block mb-1">
                {locale === 'ar' ? 'ملاحظات للمندوب (اختياري)' : 'Delivery Notes'}
              </label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder={locale === 'ar' ? 'الاتصال قبل الوصول' : 'Call before delivery'}
                className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
              />
            </div>
          </div>
        </div>

        {/* Payment method info */}
        <div className="bg-neutral-50 rounded-xl p-3.5 border border-border flex items-center gap-2.5 text-xs text-neutral-600">
          <Truck size={18} strokeWidth={1.6} className="text-neutral-500 flex-shrink-0" />
          <span>
            {locale === 'ar' ? 'الدفع نقداً عند الاستلام ومعاينة الشحنة قبل الدفع' : 'Cash on delivery with product inspection'}
          </span>
        </div>
      </div>

      {/* Bottom Submit */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-6 pt-3 bg-white/95 backdrop-blur-xs border-t border-border z-20">
        <button
          onClick={handleSubmit}
          disabled={loading || !form.name || !form.phone || !form.address}
          className="w-full py-3 bg-ink hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? (
            <span>{locale === 'ar' ? 'جاري تأكيد الطلب...' : 'Processing...'}</span>
          ) : (
            <span>{locale === 'ar' ? `تأكيد الطلب (${finalTotal.toFixed(2)} ج.م)` : `Place Order (${finalTotal.toFixed(2)} EGP)`}</span>
          )}
        </button>
      </div>
    </div>
  );
}
