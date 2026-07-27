/**
 * التخطيط الجذري — عربي RTL أصلي.
 *
 * قاعدة (CLAUDE.md القسم 7): تصميم عربي، لا انعكاس واجهة إنجليزية.
 * `dir="rtl"` و `lang="ar"` على `<html>` نفسه، لا على غلاف داخلي.
 */

import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';

import { APP_DIRECTION, APP_LOCALE } from '@/config/constants';
import { STRINGS } from '@/config/strings';
import './globals.css';

/**
 * خط واجهة اللوحة. لكل ثيم منيو زوج خطوط خاص يُحدَّد في المرحلة 4 —
 * هذا الخط للوحة التحكم فقط.
 */
const appFont = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-app',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${STRINGS.app.name} — ${STRINGS.app.tagline}`,
    template: `%s · ${STRINGS.app.name}`,
  },
  description: STRINGS.app.description,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={APP_LOCALE}
      dir={APP_DIRECTION}
      className={`${appFont.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
