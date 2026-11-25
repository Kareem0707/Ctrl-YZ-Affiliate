'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { GovernorateShipping, PlatformSettings } from '@/lib/types';
import { INITIAL_GOVERNORATES, INITIAL_SETTINGS } from '@/lib/mockData';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

interface SettingsContextType {
  settings: PlatformSettings;
  shippingRates: GovernorateShipping[];
  currencySymbol: string;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  ...INITIAL_SETTINGS,
  returnWindowDays: INITIAL_SETTINGS.returnWindowDays ?? 7,
  announcementEn:
    INITIAL_SETTINGS.announcementEn ??
    'Winter 2026 Official Campaign — Commissions starting from 220 up to 260 EGP per hoodie',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [shippingRates, setShippingRates] = useState<GovernorateShipping[]>(INITIAL_GOVERNORATES);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data?.settings) {
        setSettings((prev) => ({
          ...prev,
          ...data.settings,
          returnWindowDays: data.settings.returnWindowDays ?? prev.returnWindowDays ?? 7,
        }));
      }

      const rates = data?.shippingRates ?? data?.governorates;
      if (Array.isArray(rates) && rates.length > 0) {
        setShippingRates(rates as GovernorateShipping[]);
      }
    } catch {
      // Keep current hydrated settings if network temporarily unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();

    const handleLocalUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail || detail.eventType === 'settings_updated' || detail.eventType === 'server_sync') {
        void refreshSettings();
      }
    };

    window.addEventListener('affiliate_data_changed', handleLocalUpdate);
    return () => window.removeEventListener('affiliate_data_changed', handleLocalUpdate);
  }, [refreshSettings]);

  // Refresh settings when another admin/tab updates DB settings
  useRealtimeSync(() => {
    void refreshSettings();
  });

  const currencySymbol =
    settings.currencySymbol ||
    (settings.currency === 'USD' ? '$' : settings.currency === 'SAR' ? 'ر.س' : 'ج.م');

  return (
    <SettingsContext.Provider
      value={{
        settings,
        shippingRates,
        currencySymbol,
        loading,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
