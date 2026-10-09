import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'J Home & Office Care — We clean, You relax.',
  description: 'Cleaning, laundry, baby sitting, house hunting and errands. Book trusted, rated providers and pay a small deposit to get started.',
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
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
