'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSettings, updateSettings } from '@/lib/dataService';
import { useSettings } from '@/contexts/SettingsContext';

export default function AdminSettings() {
  const { refreshSettings } = useSettings();
  const [storeName, setStoreName] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(200);
  const [returnWindowDays, setReturnWindowDays] = useState(7);
  const [contactWhatsApp, setContactWhatsApp] = useState('+201012345678');
  const [announcement, setAnnouncement] = useState('');
  const [announcementEn, setAnnouncementEn] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setStoreName(s.storeName);
      setCurrency(s.currency);
      setMinWithdrawalAmount(s.minWithdrawalAmount);
      setReturnWindowDays(s.returnWindowDays ?? 7);
      setContactWhatsApp(s.contactWhatsApp);
      setAnnouncement(s.announcement);
      setAnnouncementEn(s.announcementEn || '');
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateSettings({
        storeName: storeName.trim(),
        currency,
        minWithdrawalAmount: Number(minWithdrawalAmount),
        returnWindowDays: Math.max(0, Math.floor(Number(returnWindowDays) || 0)),
        contactWhatsApp: contactWhatsApp.trim(),
        announcement: announcement.trim(),
        announcementEn: announcementEn.trim() || announcement.trim(),
      });
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ إعدادات المنصة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 text-ink flex items-center justify-center">
          <Settings size={20} strokeWidth={1.6} />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink">إعدادات المنصة العامة</h3>
          <p className="text-xs text-neutral-500">
            التحكم المباشر في بيانات المنصة، الإعلانات، حدود السحب، وفترة الاسترجاع (PostgreSQL Live)
          </p>
        </div>
      </div>

      {saved && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2 border border-emerald-200">
          <CheckCircle2 size={15} strokeWidth={1.6} />
          <span>تم حفظ الإعدادات وتطبيقها فوراً على جميع الزوار والأجهزة</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-xs font-medium flex items-center gap-2 border border-red-200">
          <AlertCircle size={15} strokeWidth={1.6} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 text-xs font-medium text-neutral-700">
        <div>
          <label className="block mb-1">اسم المنصة / المتجر</label>
          <input
            type="text"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block mb-1">العملة الأساسية</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-semibold"
            >
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>

          <div>
            <label className="block mb-1">الحد الأدنى لسحب الأرباح</label>
            <input
              type="number"
              min={1}
              required
              value={minWithdrawalAmount}
              onChange={(e) => setMinWithdrawalAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink font-normal"
            />
          </div>

          <div>
            <label className="block mb-1">فترة قفل الاسترجاع (أيام)</label>
            <input
              type="number"
              min={0}
              max={60}
              required
              value={returnWindowDays}
              onChange={(e) => setReturnWindowDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink font-normal"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1">رقم واتساب دعم المسوقين (Hotline)</label>
          <input
            type="text"
            required
            value={contactWhatsApp}
            onChange={(e) => setContactWhatsApp(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink font-normal"
          />
        </div>

        <div>
          <label className="block mb-1">الشريط الإعلاني العلوي (بالعربية)</label>
          <textarea
            rows={2}
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink resize-none font-normal"
          />
        </div>

        <div>
          <label className="block mb-1">الشريط الإعلاني العلوي (بالإنجليزية)</label>
          <textarea
            rows={2}
            dir="ltr"
            value={announcementEn}
            onChange={(e) => setAnnouncementEn(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink resize-none font-normal"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          <Save size={14} strokeWidth={1.6} />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
        </button>
      </form>
    </div>
  );
}
