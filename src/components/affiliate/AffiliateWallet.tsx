'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Building,
  Smartphone,
  Send,
  X,
  Percent,
} from 'lucide-react';
import type { Marketer, WithdrawalRequest } from '@/lib/types';
import { getWithdrawalsByMarketer, createWithdrawalRequest } from '@/lib/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface AffiliateWalletProps {
  marketer: Marketer;
}

export default function AffiliateWallet({ marketer }: AffiliateWalletProps) {
  const { refreshMarketer } = useAuth();
  const { locale } = useLanguage();

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [method, setMethod] = useState<'vodafone_cash' | 'instapay' | 'bank_transfer'>('vodafone_cash');
  const [amount, setAmount] = useState<number>(500);
  const [accountDetails, setAccountDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchWithdrawals = async () => {
    const list = await getWithdrawalsByMarketer(marketer.id);
    setWithdrawals(list);
  };

  useEffect(() => {
    fetchWithdrawals();
    setAccountDetails(marketer.payoutInfo?.accountNumber || marketer.phone || '');
  }, [marketer]);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 200) {
      setError('الحد الأدنى لطلب سحب الأرباح هو 200 ج.م');
      return;
    }
    if (amount > marketer.walletBalance) {
      setError('المبلغ المطلوب أكبر من الرصيد المتاح للسحب في محفظتك');
      return;
    }
    if (!accountDetails.trim()) {
      setError('يرجى إدخال رقم المحفظة أو بيانات الحساب بدقة');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createWithdrawalRequest({
        marketerId: marketer.id,
        marketerName: marketer.name,
        marketerPhone: marketer.phone,
        amount,
        paymentMethod: method,
        accountDetails: accountDetails.trim(),
      });

      setSuccess('تم إرسال طلب السحب بنجاح. سيتم التحويل خلال 24 ساعة.');
      await fetchWithdrawals();
      await refreshMarketer();
      setTimeout(() => {
        setModalOpen(false);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء إرسال طلب السحب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance Card */}
        <div className="bg-ink text-white p-5 rounded-xl border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-financial animate-pulse" />
                {locale === 'ar' ? 'الرصيد المتاح للسحب' : 'Available Balance'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300">
                <Wallet size={16} strokeWidth={1.6} />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-white num-tabular mb-1">
              {marketer.walletBalance.toLocaleString()}{' '}
              <span className="text-xs font-sans font-normal text-neutral-400">ج.م</span>
            </div>
          </div>
          <button
            onClick={() => {
              setModalOpen(true);
              setAmount(Math.min(marketer.walletBalance, 1000));
            }}
            disabled={marketer.walletBalance < 200}
            className="w-full mt-4 py-2 bg-white text-ink text-xs font-semibold rounded-lg hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {locale === 'ar' ? 'طلب سحب الأرباح' : 'Withdraw'}
          </button>
        </div>

        {/* Pending Balance */}
        <div className="bg-white p-5 rounded-xl border border-border flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                {locale === 'ar' ? 'الرصيد المعلق (بالشحن)' : 'Pending Balance'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center">
                <Clock size={16} strokeWidth={1.6} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink font-mono num-tabular">
              {marketer.pendingBalance.toLocaleString()}{' '}
              <span className="text-xs font-sans text-neutral-400 font-normal">ج.م</span>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-border">
            يتحول للرصيد المتاح تلقائياً فور تسليم الطلب
          </p>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-white p-5 rounded-xl border border-border flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                {locale === 'ar' ? 'إجمالي الأرباح المستلمة' : 'Total Withdrawn'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center">
                <ArrowDownLeft size={16} strokeWidth={1.6} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink font-mono num-tabular">
              {marketer.totalWithdrawn.toLocaleString()}{' '}
              <span className="text-xs font-sans text-neutral-400 font-normal">ج.م</span>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 mt-3 pt-3 border-t border-border num-tabular">
            إجمالي الأرباح الكلية: {marketer.totalEarned.toLocaleString()} ج.م
          </p>
        </div>

        {/* Delivery Success Rate */}
        <div className="bg-white p-5 rounded-xl border border-border flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                {locale === 'ar' ? 'معدل نجاح التسليم' : 'Delivery Rate'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center">
                <Percent size={14} strokeWidth={1.6} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink font-mono num-tabular">
              {marketer.deliveryRate}%
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, marketer.deliveryRate)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawals History Table */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <h3 className="text-sm font-bold text-ink">
            {locale === 'ar' ? 'سجل طلبات سحب الأرباح' : 'Withdrawal Requests'}
          </h3>
          <span className="text-xs text-neutral-400">التحويل خلال 24 ساعة كحد أقصى</span>
        </div>

        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">
            لا توجد طلبات سحب سابقة. يمكنك طلب سحب أرباحك في أي وقت عند وصول رصيدك لـ 200 ج.م
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-border text-neutral-500 uppercase font-semibold">
                  <th className="py-2.5 px-3">رقم الطلب</th>
                  <th className="py-2.5 px-3">المبلغ</th>
                  <th className="py-2.5 px-3">طريقة السحب</th>
                  <th className="py-2.5 px-3">بيانات الحساب</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">إيصال التحويل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-ink num-tabular">{w.requestId}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-ink num-tabular">{w.amount} ج.م</td>
                    <td className="py-2.5 px-3 font-medium text-neutral-700">
                      {w.paymentMethod === 'vodafone_cash' && 'فودافون كاش'}
                      {w.paymentMethod === 'instapay' && 'انستاباي'}
                      {w.paymentMethod === 'bank_transfer' && 'تحويل بنكي'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-600 num-tabular">{w.accountDetails}</td>
                    <td className="py-2.5 px-3">
                      {w.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          تم التحويل
                        </span>
                      )}
                      {w.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          قيد المراجعة
                        </span>
                      )}
                      {w.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          مرفوض
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400" suppressHydrationWarning>
                      <span className="num-tabular">{new Date(w.createdAt).toLocaleDateString('ar-EG')}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-600 num-tabular">
                      {w.transactionReceipt || w.rejectReason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl w-full max-w-md p-6 border border-border shadow-md relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
            >
              <X size={16} strokeWidth={1.6} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 text-ink flex items-center justify-center">
                <Wallet size={20} strokeWidth={1.6} />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  {locale === 'ar' ? 'طلب سحب أرباح' : 'Withdraw Earnings'}
                </h3>
                <p className="text-xs text-neutral-500">
                  رصيدك المتاح للسحب: <span className="font-bold text-emerald-700 num-tabular">{marketer.walletBalance} ج.م</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={14} strokeWidth={1.6} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 size={14} strokeWidth={1.6} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1.5">
                  {locale === 'ar' ? 'اختر طريقة استلام الأرباح:' : 'Payout Method:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('vodafone_cash')}
                    className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                      method === 'vodafone_cash'
                        ? 'bg-neutral-900 border-neutral-900 text-white'
                        : 'border-border text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Smartphone size={16} strokeWidth={1.6} />
                    <span>فودافون كاش</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('instapay')}
                    className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                      method === 'instapay'
                        ? 'bg-neutral-900 border-neutral-900 text-white'
                        : 'border-border text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <CreditCard size={16} strokeWidth={1.6} />
                    <span>انستاباي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('bank_transfer')}
                    className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                      method === 'bank_transfer'
                        ? 'bg-neutral-900 border-neutral-900 text-white'
                        : 'border-border text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Building size={16} strokeWidth={1.6} />
                    <span>تحويل بنكي</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1">
                  {locale === 'ar' ? 'المبلغ المطلوب سحبه (ج.م) *' : 'Amount (EGP) *'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={200}
                    max={marketer.walletBalance}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-lg border border-border text-sm font-semibold focus:outline-none focus:border-ink num-tabular"
                    required
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400">
                    ج.م
                  </span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[200, 500, 1000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(Math.min(v, marketer.walletBalance))}
                      className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[11px] font-medium text-neutral-700 num-tabular"
                    >
                      {v} ج.م
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmount(marketer.walletBalance)}
                    className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200 num-tabular"
                  >
                    سحب كل الرصيد ({marketer.walletBalance})
                  </button>
                </div>
              </div>

              {/* Account Details */}
              <div>
                <label className="text-xs font-medium text-neutral-700 block mb-1">
                  {method === 'vodafone_cash' && 'رقم المحفظة (فودافون كاش / أورنج / اتصالات / وي كاش) *'}
                  {method === 'instapay' && 'معرف انستاباي (InstaPay IPA أو رقم الهاتف) *'}
                  {method === 'bank_transfer' && 'اسم البنك، رقم الحساب أو الآيبان، واسم المستفيد *'}
                </label>
                <input
                  type="text"
                  required
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  placeholder={
                    method === 'vodafone_cash'
                      ? '010XXXXXXXX'
                      : method === 'instapay'
                      ? 'username@instapay'
                      : 'البنك الأهلي - رقم الحساب...'
                  }
                  className="w-full px-3.5 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-mono num-tabular"
                />
              </div>

              <button
                type="submit"
                disabled={loading || amount > marketer.walletBalance || amount < 200}
                className="w-full py-2.5 bg-ink hover:bg-neutral-800 text-white font-medium text-xs rounded-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <span>جاري إرسال الطلب...</span>
                ) : (
                  <>
                    <Send size={14} strokeWidth={1.6} />
                    <span>تأكيد طلب السحب</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
