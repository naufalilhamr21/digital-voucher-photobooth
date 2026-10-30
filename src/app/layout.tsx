import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import PwaRegister from '@/components/PwaRegister';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#DC2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Alineas Studio | Digital Photobooth Voucher System',
  description: 'Sistem voucher digital photobooth presisi tinggi untuk acara pernikahan, gala, dan corporate event Alineas Studio.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Alineas Photo',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-red-500 selection:text-white pb-safe pt-safe">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
