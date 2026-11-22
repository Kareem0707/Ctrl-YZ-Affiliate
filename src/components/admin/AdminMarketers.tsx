'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  Wallet,
  CheckCircle2,
  XCircle,
  X,
  UserPlus,
  Clock,
  Eye,
  Check,
  AlertCircle,
  Share2,
  Globe,
  ExternalLink,
  CreditCard,
  Building,
  Smartphone,
  ShieldCheck,
  Filter,
  MessageSquare,
} from 'lucide-react';
import type { Marketer, MarketerStatus } from '@/lib/types';
import { saveMarketer, toggleMarketerStatus, approveMarketer, rejectMarketer } from '@/lib/dataService';

interface AdminMarketersProps {
  marketers: Marketer[];
  onRefresh: () => void;
}

export default function AdminMarketers({ marketers, onRefresh }: AdminMarketersProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<Marketer | null>(null);

  // Manual create marketer modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAffiliateCode, setNewAffiliateCode] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Approval custom code state
  const [customApproveCode, setCustomApproveCode] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectPromptOpen, setRejectPromptOpen] = useState(false);

  const pendingCount = marketers.filter((m) => m.status === 'pending').length;

  const filtered = marketers.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search) ||
      m.affiliateCode.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.city && m.city.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return m.status === 'pending';
    if (statusFilter === 'active') return m.status === 'active';
    if (statusFilter === 'rejected') return m.status === 'rejected' || m.status === 'suspended';
    return true;
  });

  const handleToggleStatus = async (id: string) => {
    await toggleMarketerStatus(id);
    onRefresh();
  };

  const handleOpenApplicant = (m: Marketer) => {
    setSelectedApplicant(m);
    setCustomApproveCode(m.affiliateCode || `YZ-${m.name.slice(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
    setRejectPromptOpen(false);
    setRejectReason('');
  };

  const handleApprove = async () => {
    if (!selectedApplicant) return;
    setLoadingAction(true);
    try {
      await approveMarketer(selectedApplicant.id, customApproveCode);
      onRefresh();
      setSelectedApplicant(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplicant) return;
    setLoadingAction(true);
    try {
      await rejectMarketer(selectedApplicant.id, rejectReason || 'لم يتم استيفاء شروط الانضمام');
      onRefresh();
      setSelectedApplicant(null);
      setRejectPromptOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateMarketer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    setLoadingAction(true);
    try {
      await saveMarketer({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim() || `${newPhone.trim()}@affiliate.com`,
        affiliateCode: newAffiliateCode.trim() || `AFF-${Math.floor(100 + Math.random() * 900)}`,
        status: 'active',
      });
      onRefresh();
      setCreateModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAffiliateCode('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Pending Applications Alert Banner */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0 font-bold">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-xs font-bold">
                يوجد {pendingCount} طلبات انضمام لمسوقين جدد بانتظار المراجعة والاعتماد
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                عاين بيانات الاتصال والرقم القومي وقنوات التسويق قبل الموافقة وتفعيل كود الإحالة
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1.5"
          >
            <Eye size={13} />
            <span>عرض طلبات الانضمام ({pendingCount})</span>
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              statusFilter === 'all'
                ? 'bg-ink text-white border-ink'
                : 'bg-neutral-50 text-neutral-600 border-border hover:bg-neutral-100'
            }`}
          >
            جميع المسوقين ({marketers.length})
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-neutral-50 text-amber-800 border-border hover:bg-amber-50'
            }`}
          >
            <span>طلبات الانضمام</span>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-neutral-50 text-neutral-600 border-border hover:bg-neutral-100'
            }`}
          >
            المعتمدين النشطين ({marketers.filter((m) => m.status === 'active').length})
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              statusFilter === 'rejected'
                ? 'bg-neutral-800 text-white border-neutral-800'
                : 'bg-neutral-50 text-neutral-600 border-border hover:bg-neutral-100'
            }`}
          >
            المرفوضين / الموقوفين
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} strokeWidth={1.6} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم، الهاتف، المحافظة..."
              className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-neutral-50 border border-border text-xs focus:outline-none focus:border-ink"
            />
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-medium text-xs flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">إضافة مسوق يدوياً</span>
          </button>
        </div>
      </div>

      {/* Marketers List Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-border text-neutral-500 uppercase font-semibold text-[11px]">
                <th className="py-3 px-4">المسوق</th>
                <th className="py-3 px-3">الاتصال والمحافظة</th>
                <th className="py-3 px-3">كود الإحالة</th>
                <th className="py-3 px-3">قنوات التسويق</th>
                <th className="py-3 px-3">الأرباح المسجلة</th>
                <th className="py-3 px-3">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 text-xs">
                    لا يوجد مسوقين يطابقون خيارات البحث أو التصفية
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isPending = m.status === 'pending';
                  const isActive = m.status === 'active';
                  const isRejected = m.status === 'rejected';

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-neutral-50/60 transition-colors ${
                        isPending ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-ink text-xs flex-shrink-0">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-ink block leading-snug">{m.name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">{m.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Governorate */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono text-neutral-800 font-medium block">{m.phone}</span>
                          <span className="text-[10px] text-neutral-500 block">{m.city || 'مصر'}</span>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3 px-3 font-mono">
                        <span className="bg-neutral-100 text-neutral-900 border border-neutral-200 px-2 py-0.5 rounded font-bold text-[11px]">
                          {m.affiliateCode || '—'}
                        </span>
                      </td>

                      {/* Channels & Volume */}
                      <td className="py-3 px-3 text-[11px] text-neutral-600">
                        {m.marketingChannels && m.marketingChannels.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {m.marketingChannels.slice(0, 2).map((ch, i) => (
                              <span key={i} className="bg-neutral-100 px-1.5 py-0.5 rounded text-[10px]">
                                {ch.split(' ')[0]}
                              </span>
                            ))}
                            {m.marketingChannels.length > 2 && (
                              <span className="text-[10px] text-neutral-400">+{m.marketingChannels.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">مباشر</span>
                        )}
                      </td>

                      {/* Balances */}
                      <td className="py-3 px-3 font-mono">
                        <div>
                          <span className="text-emerald-700 font-bold block">{m.walletBalance} ج.م</span>
                          <span className="text-[10px] text-neutral-400">معلق: {m.pendingBalance} ج.م</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock size={11} />
                            <span>قيد المراجعة</span>
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} />
                            <span>معتمد نشط</span>
                          </span>
                        )}
                        {m.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                            موقوف مؤقتاً
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                            مرفوض
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Inspect / Review Application Button */}
                          <button
                            onClick={() => handleOpenApplicant(m)}
                            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-xs flex items-center gap-1 transition"
                            title="معاينة الملف الكامل"
                          >
                            <Eye size={13} />
                            <span className="hidden sm:inline">معاينة</span>
                          </button>

                          {/* Quick Toggle Status */}
                          {!isPending && (
                            <button
                              onClick={() => handleToggleStatus(m.id)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                                isActive
                                  ? 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={isActive ? 'إيقاف الحساب' : 'تنشيط الحساب'}
                            >
                              {isActive ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Full Marketer Application Review & Decision */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div
            dir="rtl"
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border shadow-2xl p-6 sm:p-8 space-y-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-ink text-base">
                  {selectedApplicant.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-ink">
                      {selectedApplicant.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedApplicant.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedApplicant.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedApplicant.status === 'active'
                        ? 'معتمد نشط'
                        : selectedApplicant.status === 'pending'
                        ? 'طلب انضمام جديد'
                        : 'مرفوض'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    تاريخ التسجيل: {new Date(selectedApplicant.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'full' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Applicant Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Box 1: Personal & Verification */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2.5">
                <h4 className="font-bold text-ink flex items-center gap-1.5 pb-1 border-b border-border">
                  <ShieldCheck size={14} className="text-brand" />
                  <span>البيانات الشخصية وإثبات الهوية</span>
                </h4>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">الرقم القومي:</span>
                  <span className="font-mono font-bold text-ink">{selectedApplicant.nationalId || 'غير مسجل'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">المحافظة / المدينة:</span>
                  <span className="font-semibold text-ink">{selectedApplicant.city || 'مصر'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">البريد الإلكتروني:</span>
                  <span className="font-mono text-ink select-all">{selectedApplicant.email}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-neutral-500">الهاتف والواتساب:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-ink">{selectedApplicant.phone}</span>
                    <a
                      href={`https://wa.me/20${selectedApplicant.whatsapp?.replace(/^0/, '') || selectedApplicant.phone?.replace(/^0/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <MessageSquare size={10} />
                      <span>واتساب</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Box 2: Marketing Experience & Channels */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2.5">
                <h4 className="font-bold text-ink flex items-center gap-1.5 pb-1 border-b border-border">
                  <Share2 size={14} className="text-brand" />
                  <span>قنوات البيع والخبرة الإعلانية</span>
                </h4>

                <div>
                  <span className="text-neutral-500 block mb-1">القنوات التسويقية المحددة:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedApplicant.marketingChannels?.map((ch, idx) => (
                      <span key={idx} className="bg-white border border-border px-2 py-0.5 rounded text-[11px] font-medium text-ink">
                        {ch}
                      </span>
                    )) || <span className="text-neutral-400">لم تحدد</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">مستوى الخبرة:</span>
                  <span className="font-bold text-brand">
                    {selectedApplicant.experienceLevel === 'expert'
                      ? 'محترف (إعلانات ممولة ومبيعات يومية)'
                      : selectedApplicant.experienceLevel === 'intermediate'
                      ? 'متوسط (سبق له البيع بالأفلييت)'
                      : 'مبتدئ'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">الطلبات المتوقعة شهرياً:</span>
                  <span className="font-semibold text-ink">{selectedApplicant.expectedMonthlyOrders || '20-50'} قطعة</span>
                </div>

                {selectedApplicant.channelLinks && (
                  <div className="pt-1">
                    <span className="text-neutral-500 block mb-0.5">رابط الصفحة / القناة:</span>
                    <a
                      href={selectedApplicant.channelLinks}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-[11px] truncate max-w-full"
                    >
                      <span className="truncate">{selectedApplicant.channelLinks}</span>
                      <ExternalLink size={11} className="flex-shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Box 3: Payout Details */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-border space-y-2.5 sm:col-span-2">
                <h4 className="font-bold text-ink flex items-center gap-1.5 pb-1 border-b border-border">
                  <Wallet size={14} className="text-emerald-600" />
                  <span>بيانات استلام الأرباح والعمولات</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-neutral-500 block mb-0.5">طريقة التحويل:</span>
                    <span className="font-bold text-ink uppercase">
                      {selectedApplicant.payoutInfo?.method === 'vodafone_cash'
                        ? 'فودافون كاش'
                        : selectedApplicant.payoutInfo?.method === 'instapay'
                        ? 'إنستاباي (InstaPay)'
                        : 'تحويل بنكي'}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-500 block mb-0.5">رقم المحفظة / الحساب:</span>
                    <span className="font-mono font-bold text-ink select-all">
                      {selectedApplicant.payoutInfo?.accountNumber || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-500 block mb-0.5">اسم صاحب الحساب:</span>
                    <span className="font-semibold text-ink">
                      {selectedApplicant.payoutInfo?.accountHolderName || selectedApplicant.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval / Rejection Controls */}
            {selectedApplicant.status === 'pending' && (
              <div className="p-4 rounded-xl bg-neutral-100 border border-neutral-300 space-y-3">
                <h4 className="font-bold text-ink text-xs">قرار المشرف الإداري:</h4>

                {!rejectPromptOpen ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <label className="block mb-1 text-[11px] font-semibold text-neutral-600">
                          كود المسوق الترويجي المعتمد (يمكن تعديله قبل الاعتماد):
                        </label>
                        <input
                          type="text"
                          value={customApproveCode}
                          onChange={(e) => setCustomApproveCode(e.target.value.toUpperCase())}
                          className="w-full px-3 py-1.5 rounded-lg border border-border font-mono text-xs font-bold text-ink focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={handleApprove}
                        disabled={loadingAction}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                      >
                        <Check size={15} />
                        <span>{loadingAction ? 'جاري الاعتماد...' : 'قبول واعتماد المسوق وتفعيل كوده ✓'}</span>
                      </button>

                      <button
                        onClick={() => setRejectPromptOpen(true)}
                        className="py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition"
                      >
                        رفض الطلب
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-semibold text-red-800">
                      سبب رفض الطلب (سيظهر للمسوق):
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="مثال: بيانات الرقم القومي غير مطابقة، أو المحفظة غير صحيحة"
                      className="w-full px-3 py-1.5 rounded-lg border border-red-300 text-xs text-ink focus:outline-none focus:border-red-500"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleReject}
                        disabled={loadingAction}
                        className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition"
                      >
                        تأكيد رفض الطلب
                      </button>
                      <button
                        onClick={() => setRejectPromptOpen(false)}
                        className="py-2 px-3 rounded-lg bg-white border border-border text-neutral-600 font-medium text-xs hover:bg-neutral-50 transition"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Close Button */}
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedApplicant(null)}
                className="px-5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Manual Add Marketer */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div
            dir="rtl"
            className="bg-white rounded-2xl max-w-md w-full border border-border shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-ink text-sm flex items-center gap-1.5">
                <UserPlus size={16} className="text-brand" />
                <span>إضافة مسوق يدوياً</span>
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-neutral-400 hover:text-ink">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateMarketer} className="space-y-3.5 text-xs font-semibold text-neutral-700">
              <div>
                <label className="block mb-1 text-ink">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="محمد الديب"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink"
                />
              </div>

              <div>
                <label className="block mb-1 text-ink">رقم الهاتف *</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono focus:outline-none focus:border-ink"
                />
              </div>

              <div>
                <label className="block mb-1 text-ink">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="marketer@gmail.com"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink"
                />
              </div>

              <div>
                <label className="block mb-1 text-ink">كود الإحالة الترويجي</label>
                <input
                  type="text"
                  value={newAffiliateCode}
                  onChange={(e) => setNewAffiliateCode(e.target.value.toUpperCase())}
                  placeholder="DEEB-YZ"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono font-bold focus:outline-none focus:border-ink"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="flex-1 py-2.5 rounded-xl bg-ink text-white font-bold text-xs hover:bg-neutral-800 transition"
                >
                  {loadingAction ? 'جاري الإضافة...' : 'حفظ وتفعيل المسوق'}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-neutral-600 text-xs font-semibold hover:bg-neutral-50 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
