'use client';

import React, { useState } from 'react';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  X,
} from 'lucide-react';
import type { WithdrawalRequest } from '@/lib/types';
import { updateWithdrawalStatus } from '@/lib/dataService';

interface AdminWithdrawalsProps {
  withdrawals: WithdrawalRequest[];
  onRefresh: () => void;
}

export default function AdminWithdrawals({ withdrawals, onRefresh }: AdminWithdrawalsProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [activeReq, setActiveReq] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [receiptOrReason, setReceiptOrReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = withdrawals.filter((w) => filter === 'all' || w.status === filter);

  const openActionModal = (req: WithdrawalRequest, type: 'approve' | 'reject') => {
    setActiveReq(req);
    setActionType(type);
    setModalError(null);
    setReceiptOrReason(type === 'approve' ? `TX-${Math.floor(10000000 + Math.random() * 90000000)}` : 'بيانات الحساب غير مطابقة');
  };

  const handleConfirmAction = async () => {
    if (!activeReq) return;
    setLoading(true);
    setModalError(null);
    try {
      await updateWithdrawalStatus(activeReq.id, actionType === 'approve' ? 'approved' : 'rejected', receiptOrReason.trim());
      onRefresh();
      setActiveReq(null);
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : 'تعذر معالجة طلب السحب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-border flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'all', label: 'جميع طلبات السحب' },
          { id: 'pending', label: 'قيد المراجعة والتحويل' },
          { id: 'approved', label: 'تم التحويل' },
          { id: 'rejected', label: 'مرفوض ومردود' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === t.id
                ? 'bg-ink text-white font-semibold'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-border text-neutral-500 uppercase font-semibold">
                <th className="py-3 px-3.5">رقم الطلب</th>
                <th className="py-3 px-3.5">المسوق</th>
                <th className="py-3 px-3.5">المبلغ المطلوب</th>
                <th className="py-3 px-3.5">طريقة التحويل</th>
                <th className="py-3 px-3.5">بيانات الحساب / المحفظة</th>
                <th className="py-3 px-3.5">تاريخ الطلب</th>
                <th className="py-3 px-3.5">الحالة</th>
                <th className="py-3 px-3.5">رقم العملية / السبب</th>
                <th className="py-3 px-3.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-3.5 font-mono font-semibold text-ink num-tabular">{req.requestId}</td>

                  <td className="py-3 px-3.5 font-medium text-ink">
                    <div className="font-semibold">{req.marketerName}</div>
                    <div className="text-[10px] text-neutral-400 font-mono num-tabular">{req.marketerPhone}</div>
                  </td>

                  <td className="py-3 px-3.5 font-mono font-bold text-emerald-700 num-tabular">
                    {req.amount} ج.م
                  </td>

                  <td className="py-3 px-3.5 font-medium text-neutral-700">
                    {req.paymentMethod === 'vodafone_cash' && 'فودافون كاش'}
                    {req.paymentMethod === 'instapay' && 'انستاباي'}
                    {req.paymentMethod === 'bank_transfer' && 'تحويل بنكي'}
                  </td>

                  <td className="py-3 px-3.5 font-mono text-ink font-semibold num-tabular">
                    {req.accountDetails}
                  </td>

                  <td className="py-3 px-3.5 text-neutral-400" suppressHydrationWarning>
                    <span className="num-tabular">{new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                  </td>

                  <td className="py-3 px-3.5">
                    {req.status === 'approved' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        تم التحويل
                      </span>
                    )}
                    {req.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        قيد المراجعة
                      </span>
                    )}
                    {req.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        مرفوض
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3.5 font-mono text-[11px] text-neutral-600 num-tabular">
                    {req.transactionReceipt || req.rejectReason || '—'}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    {req.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openActionModal(req, 'approve')}
                          className="px-2.5 py-1 rounded bg-ink hover:bg-neutral-800 text-white font-medium text-xs transition-colors"
                        >
                          تأكيد التحويل
                        </button>
                        <button
                          onClick={() => openActionModal(req, 'reject')}
                          className="px-2.5 py-1 rounded border border-border text-neutral-600 hover:bg-red-50 hover:text-red-600 text-xs font-medium transition-colors"
                        >
                          رفض
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve / Reject Modal */}
      {activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl w-full max-w-md p-6 border border-border shadow-md relative">
            <button
              onClick={() => setActiveReq(null)}
              className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
            >
              <X size={16} strokeWidth={1.6} />
            </button>

            <h3 className="text-base font-bold text-ink mb-1">
              {actionType === 'approve' ? 'تأكيد تحويل أرباح المسوق' : 'رفض طلب السحب'}
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              المسوق: <strong className="text-ink">{activeReq.marketerName}</strong> • المبلغ: <strong className="text-emerald-700 num-tabular">{activeReq.amount} ج.م</strong>
            </p>

            <div className="space-y-3.5 text-xs font-medium text-neutral-700">
              {modalError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {modalError}
                </div>
              )}
              <div className="p-3 bg-neutral-50 rounded-lg border border-border space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">طريقة التحويل:</span>
                  <span className="font-semibold text-ink">
                    {activeReq.paymentMethod === 'vodafone_cash' && 'فودافون كاش'}
                    {activeReq.paymentMethod === 'instapay' && 'انستاباي'}
                    {activeReq.paymentMethod === 'bank_transfer' && 'تحويل بنكي'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">بيانات التحويل:</span>
                  <span className="font-mono font-bold text-ink num-tabular">{activeReq.accountDetails}</span>
                </div>
              </div>

              <div>
                <label className="block mb-1">
                  {actionType === 'approve' ? 'رقم عملية التحويل / الإيصال البنكي:' : 'سبب رفض الطلب:'}
                </label>
                <input
                  type="text"
                  required
                  value={receiptOrReason}
                  onChange={(e) => setReceiptOrReason(e.target.value)}
                  placeholder={actionType === 'approve' ? 'TX-12345678' : 'الرقم غير مسجل بمحفظة...'}
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-mono num-tabular font-normal"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReq(null)}
                  className="flex-1 py-2 rounded-lg border border-border text-neutral-700 text-xs font-medium hover:bg-neutral-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={loading}
                  className={`flex-1 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50 transition-colors ${
                    actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? 'جاري المعالجة...' : actionType === 'approve' ? 'تأكيد التحويل وإغلاق الطلب' : 'تأكيد الرفض ورد الرصيد'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
