'use client';

import './globals.css';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import TopNavBar from '@/components/navigation/TopNavBar';

function HtmlWrapper({ children }: { children: React.ReactNode }) {
  const { locale, dir } = useLanguage();

  return (
    <html lang={locale} dir={dir}>
      <head>
        <title>Ctrl YZ Affiliate | منصة المسوقين والتجارة الإلكترونية</title>
        <meta name="description" content="Ctrl YZ - كولكشن الشتاء الرسمي، التجارة والتسويق بالعمولة الموثوقة للمسوقين في مصر والشرق الأوسط" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/ctrl-logo-transparent.png" />
      </head>
      <body className="bg-canvas text-ink min-h-screen antialiased selection:bg-brand selection:text-white font-sans">
        <TopNavBar />
        {children}
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <HtmlWrapper>{children}</HtmlWrapper>
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
