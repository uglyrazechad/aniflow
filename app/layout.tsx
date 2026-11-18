import type { Metadata, Viewport } from 'next';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/toaster';

import './globals.css';

const siteUrl =
  process.env.SITE_URL?.trim() ||
  process.env.RENDER_EXTERNAL_URL?.trim() ||
  'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AniFlow — аниме онлайн с плеером AnimeGO',
    template: '%s · AniFlow',
  },
  description:
    'Современный каталог аниме с поиском, подборками и встроенным плеером AnimeGO. Тёмная тема, адаптивный интерфейс, выбор озвучки и качества.',
  keywords: ['аниме', 'смотреть аниме', 'AnimeGO', 'онлайн', 'каталог аниме'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'AniFlow',
    title: 'AniFlow — аниме онлайн',
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
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
