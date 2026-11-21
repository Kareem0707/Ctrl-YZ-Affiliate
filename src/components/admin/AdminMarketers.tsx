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
} from 'lucide-react';
import type { Marketer } from '@/lib/types';
import { saveMarketer, toggleMarketerStatus } from '@/lib/dataService';

interface AdminMarketersProps {
  marketers: Marketer[];
  onRefresh: () => void;
}

export default function AdminMarketers({ marketers, onRefresh }: AdminMarketersProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = marketers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search) ||
      m.affiliateCode.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleStatus = async (id: string) => {
    await toggleMarketerStatus(id);
    onRefresh();
  };

  const handleCreateMarketer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    setLoading(true);
    try {
      await saveMarketer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || `${phone.trim()}@affiliate.com`,
        affiliateCode: affiliateCode.trim() || `AFF-${Math.floor(100 + Math.random() * 900)}`,
      });
      onRefresh();
      setModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setAffiliateCode('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Search */}
      <div className="bg-white p-4 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={16} strokeWidth={1.6} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المسوق، الهاتف، أو الكود..."
            className="w-full pr-10 pl-3.5 py-2 rounded-lg bg-neutral-50 border border-border text-xs focus:outline-none focus:border-ink"
          />
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-ink text-white font-medium text-xs flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
        >
          <UserPlus size={15} strokeWidth={1.6} />
          <span>تسجيل مسوق جديد</span>
        </button>
      </div>

      {/* Marketers Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-border text-neutral-500 uppercase font-semibold">
                <th className="py-3 px-3.5">المسوق</th>
                <th className="py-3 px-3.5">كود الإحالة</th>
                <th className="py-3 px-3.5">الهاتف والإيميل</th>
                <th className="py-3 px-3.5">الرصيد المتاح</th>
                <th className="py-3 px-3.5">الرصيد المعلق</th>
                <th className="py-3 px-3.5">إجمالي الأرباح</th>
                <th className="py-3 px-3.5">نسبة التسليم</th>
                <th className="py-3 px-3.5">الحالة</th>
                <th className="py-3 px-3.5 text-center">إجراءات الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 text-ink flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-ink">{m.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono num-tabular">ID: {m.id}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3.5 font-mono font-semibold text-brand num-tabular">
                    {m.affiliateCode}
                  </td>

                  <td className="py-3 px-3.5 text-neutral-600">
                    <div className="font-mono text-ink num-tabular">{m.phone}</div>
                    <div className="text-[10px] text-neutral-400">{m.email}</div>
                  </td>

                  <td className="py-3 px-3.5 font-mono font-bold text-emerald-700 num-tabular">
                    {m.walletBalance} ج.م
                  </td>

                  <td className="py-3 px-3.5 font-mono font-semibold text-neutral-600 num-tabular">
                    {m.pendingBalance} ج.م
                  </td>

                  <td className="py-3 px-3.5 font-mono font-semibold text-ink num-tabular">
                    {m.totalEarned} ج.م
                  </td>

                  <td className="py-3 px-3.5 font-mono font-semibold text-neutral-800 num-tabular">
                    {m.deliveryRate}%
                  </td>

                  <td className="py-3 px-3.5">
                    {m.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        موقوف
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    <button
                      onClick={() => handleToggleStatus(m.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        m.status === 'active'
                          ? 'border border-border text-neutral-600 hover:bg-neutral-50'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {m.status === 'active' ? 'إيقاف مؤقت' : 'تفعيل'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Marketer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl w-full max-w-md p-6 border border-border shadow-md relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors"
            >
              <X size={16} strokeWidth={1.6} />
            </button>

            <h3 className="text-base font-bold text-ink mb-4 pb-2 border-b border-border">
              تسجيل مسوق جديد
            </h3>

            <form onSubmit={handleCreateMarketer} className="space-y-3.5 text-xs font-medium text-neutral-700">
              <div>
                <label className="block mb-1">اسم المسوق *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
                />
              </div>

              <div>
                <label className="block mb-1">رقم الهاتف (واتساب) *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink font-normal"
                />
              </div>

              <div>
                <label className="block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marketer@gmail.com"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
                />
              </div>

              <div>
                <label className="block mb-1">كود الإحالة الترويجي (تلقائي إن ترك فارغاً)</label>
                <input
                  type="text"
                  value={affiliateCode}
                  onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                  placeholder="AFF-XYZ"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono uppercase num-tabular focus:outline-none focus:border-ink font-normal"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-border text-neutral-700 text-xs font-medium hover:bg-neutral-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-ink text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'جاري الحفظ...' : 'تسجيل المسوق'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
