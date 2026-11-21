'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { locale, setLocale, dir } = useLanguage();

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`fixed top-4 z-50 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:bg-white ${
        dir === 'rtl' ? 'left-4' : 'right-4'
      }`}
    >
      {locale === 'en' ? 'عربي' : 'English'}
    </button>
  );
}
