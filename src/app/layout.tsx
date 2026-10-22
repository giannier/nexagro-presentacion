import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'NEXAGRO Export',
  description:
    'Conoce NEXAGRO Export en una experiencia interactiva en tres dimensiones.',
  applicationName: 'NEXAGRO Export',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'NEXAGRO Export',
    description:
      'Conoce NEXAGRO Export en una experiencia interactiva en tres dimensiones.',
    type: 'website',
    locale: 'es_PE',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // The wheel handles vertical gestures; pinch-zoom would fight the drag.
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
