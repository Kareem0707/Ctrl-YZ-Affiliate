'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2 } from 'lucide-react';
import type { PlatformSettings } from '@/lib/types';
import { getSettings, updateSettings } from '@/lib/dataService';

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [storeName, setStoreName] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(200);
  const [contactWhatsApp, setContactWhatsApp] = useState('+201012345678');
  const [announcement, setAnnouncement] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setStoreName(s.storeName);
      setCurrency(s.currency);
      setMinWithdrawalAmount(s.minWithdrawalAmount);
      setContactWhatsApp(s.contactWhatsApp);
      setAnnouncement(s.announcement);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      storeName,
      currency,
      minWithdrawalAmount: Number(minWithdrawalAmount),
      contactWhatsApp,
      announcement,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5 sm:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 text-ink flex items-center justify-center">
          <Settings size={20} strokeWidth={1.6} />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink">إعدادات المنصة العامة</h3>
          <p className="text-xs text-neutral-500">التحكم في بيانات المنصة، الإعلانات، وحدود السحب</p>
        </div>
      </div>

      {saved && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2 border border-emerald-200">
          <CheckCircle2 size={15} strokeWidth={1.6} />
          <span>تم حفظ الإعدادات وتطبيقها بنجاح</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 text-xs font-medium text-neutral-700">
        <div>
          <label className="block mb-1">اسم المنصة / المتجر</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink font-normal"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            <label className="block mb-1">الحد الأدنى لسحب الأرباح (ج.م)</label>
            <input
              type="number"
              value={minWithdrawalAmount}
              onChange={(e) => setMinWithdrawalAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink font-normal"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1">رقم واتساب دعم المسوقين (Hotline)</label>
          <input
            type="text"
            value={contactWhatsApp}
            onChange={(e) => setContactWhatsApp(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-xs font-mono num-tabular focus:outline-none focus:border-ink font-normal"
          />
        </div>

        <div>
          <label className="block mb-1">الشريط الإعلاني العلوي للمنصة</label>
          <textarea
            rows={2}
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-xs focus:outline-none focus:border-ink resize-none font-normal"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-ink text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
        >
          <Save size={14} strokeWidth={1.6} />
          <span>حفظ التعديلات</span>
        </button>
      </form>
    </div>
  );
}
