import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { PWARegister } from '@/components/PWA';

export const metadata: Metadata = {
  title: 'J Home & Office Care — We clean, You relax.',
  description: 'Cleaning, laundry, baby sitting, house hunting and errands. Book trusted, rated providers and pay a small deposit to get started.',
  manifest: '/manifest.webmanifest',
  applicationName: 'J Home & Office Care',
  icons: { icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }], apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'J Home', statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = { themeColor: '#0f3d1e', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Oswald:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body><AuthProvider><PWARegister />{children}</AuthProvider></body>
    </html>
  );
}
