import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import Providers from '@/components/Providers';
import type { Locale } from '@/contexts/LanguageContext';

export const metadata: Metadata = {
  title: 'Ctrl YZ Affiliate | منصة المسوقين والتجارة الإلكترونية',
  description:
    'Ctrl YZ - كولكشن الشتاء الرسمي، التجارة والتسويق بالعمولة الموثوقة للمسوقين في مصر والشرق الأوسط',
  icons: {
    icon: '/ctrl-logo-transparent.png',
  },
};

// WCAG-compliant viewport (allows pinch-to-zoom on mobile; no maximumScale: 1 lock)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieLocale = cookies().get('ctrl_yz_locale')?.value;
  const initialLocale: Locale = cookieLocale === 'en' ? 'en' : 'ar';
  const dir = initialLocale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={initialLocale} dir={dir} suppressHydrationWarning>
      <body className="bg-canvas text-ink min-h-screen antialiased selection:bg-brand selection:text-white font-sans">
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
