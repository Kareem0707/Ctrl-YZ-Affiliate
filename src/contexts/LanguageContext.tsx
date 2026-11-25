'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

export type Locale = 'en' | 'ar';

export const LOCALE_COOKIE_NAME = 'ctrl_yz_locale';

export interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const translations: Record<Locale, Record<string, unknown>> = { en, ar };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (
      current &&
      typeof current === 'object' &&
      key in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

function persistLocaleClient(nextLocale: Locale): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('locale', nextLocale);
    } catch {
      // ignore storage errors
    }
  }
}

export function LanguageProvider({
  initialLocale = 'ar',
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  // Seed directly from server-read cookie so SSR & CSR first render match 100% (zero hydration flash)
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      persistLocaleClient(newLocale);
      router.refresh();
    },
    [router]
  );

  const toggleLanguage = useCallback(() => {
    const next: Locale = locale === 'ar' ? 'en' : 'ar';
    setLocaleState(next);
    persistLocaleClient(next);
    router.refresh();
  }, [locale, router]);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(translations[locale], key);
    },
    [locale]
  );

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
