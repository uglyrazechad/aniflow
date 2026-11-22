import type { Metadata, Viewport } from 'next';

import { PwaRegistration } from '@/components/pwa-registration';
import { SiteChrome } from '@/components/site-chrome';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/toaster';

import './globals.css';

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();

const siteUrl =
  process.env.SITE_URL?.trim() ||
  process.env.RENDER_EXTERNAL_URL?.trim() ||
  (vercelUrl ? `https://${vercelUrl}` : '') ||
  'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AniHub — аниме онлайн с плеером AnimeGO',
    template: '%s · AniHub',
  },
  description:
    'Современный каталог аниме с поиском, подборками и встроенным плеером AnimeGO. Тёмная тема, адаптивный интерфейс, выбор озвучки и качества.',
  keywords: ['аниме', 'смотреть аниме', 'AnimeGO', 'онлайн', 'каталог аниме'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'AniHub',
    title: 'AniHub — аниме онлайн',
    description: 'Каталог аниме и плеер AnimeGO в аккуратном интерфейсе.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08080d' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <SiteChrome>{children}</SiteChrome>
          </div>
          <Toaster />
          <PwaRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
