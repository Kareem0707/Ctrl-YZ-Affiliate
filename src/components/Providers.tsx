'use client';

import React from 'react';
import { LanguageProvider, type Locale } from '@/contexts/LanguageContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import TopNavBar from '@/components/navigation/TopNavBar';

interface ProvidersProps {
  initialLocale: Locale;
  children: React.ReactNode;
}

export default function Providers({ initialLocale, children }: ProvidersProps) {
  return (
    <LanguageProvider initialLocale={initialLocale}>
      <SettingsProvider>
        <AuthProvider>
          <CartProvider>
            <TopNavBar />
            {children}
          </CartProvider>
        </AuthProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}
