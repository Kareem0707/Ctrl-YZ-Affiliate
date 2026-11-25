'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Save, Check, MapPin, AlertCircle } from 'lucide-react';
import type { GovernorateShipping } from '@/lib/types';
import { getShippingRates, updateShippingRate } from '@/lib/dataService';
import { useSettings } from '@/contexts/SettingsContext';

export default function AdminShipping() {
  const { refreshSettings, currencySymbol } = useSettings();
  const [rates, setRates] = useState<GovernorateShipping[]>([]);
  const [editedRates, setEditedRates] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShippingRates().then((list) => {
      setRates(list);
      const map: Record<string, number> = {};
      list.forEach((item) => {
        map[item.id] = item.fee;
      });
      setEditedRates(map);
    });
  }, []);

  const handleSave = async (id: string) => {
    const fee = editedRates[id];
    if (fee === undefined || Number.isNaN(fee) || fee < 0) {
      setError('قيمة الشحن يجب أن تكون رقماً صحيحاً غير سالب');
      return;
    }

    setSavingId(id);
    setError(null);
    try {
      const updated = await updateShippingRate(id, fee);
      setRates((prev) => prev.map((r) => (r.id === id ? updated : r)));
      await refreshSettings();
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث سعر الشحن');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 text-ink flex items-center justify-center">
          <Truck size={20} strokeWidth={1.6} />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink">
            تعريفات أسعار الشحن حسب المحافظات (مصر — PostgreSQL Live)
          </h3>
          <p className="text-xs text-neutral-500">
            يتم حفظ الأسعار مباشرة في قاعدة البيانات واحتسابها تلقائياً على الخادم في جميع الطلبات
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-xs font-medium flex items-center gap-2 border border-red-200">
          <AlertCircle size={15} strokeWidth={1.6} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {rates.map((gov) => (
          <div
            key={gov.id}
            className="p-3.5 rounded-lg border border-border bg-neutral-50/50 flex flex-col justify-between space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink text-xs flex items-center gap-1.5">
                <MapPin size={13} strokeWidth={1.6} className="text-neutral-400" />
                <span>{gov.governorate_ar}</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-medium">{gov.deliveryTime}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedRates[gov.id] ?? gov.fee}
                  onChange={(e) =>
                    setEditedRates({ ...editedRates, [gov.id]: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 rounded-md border border-border bg-white font-mono text-xs font-semibold text-ink focus:outline-none focus:border-ink num-tabular"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                  {currencySymbol}
                </span>
              </div>

              <button
                onClick={() => handleSave(gov.id)}
                disabled={savingId === gov.id}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
                  savedId === gov.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-ink hover:bg-neutral-800 text-white'
                }`}
              >
                {savedId === gov.id ? (
                  <Check size={14} strokeWidth={1.6} />
                ) : (
                  <Save size={14} strokeWidth={1.6} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
