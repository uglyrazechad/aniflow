import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { Logo } from '@/components/logo';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/50">
      <div className="container grid gap-10 py-12 md:grid-cols-[1.6fr,1fr,1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Быстрый и аккуратный каталог аниме с плеером AnimeGO. Тёмная тема по умолчанию,
            адаптивная сетка и поиск в один клик.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Навигация</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Главная
              </Link>
            </li>
            <li>
              <Link href="/search" className="transition-colors hover:text-foreground">
                Поиск
              </Link>
            </li>
            <li>
              <Link href="/#popular" className="transition-colors hover:text-foreground">
                Популярное
              </Link>
            </li>
            <li>
              <Link href="/#ongoing" className="transition-colors hover:text-foreground">
                Онгоинги
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Данные</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a
                href="https://animego.me/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                AnimeGO
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a
                href="https://github.com/YaNesyTortiK/AnimeParsers"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                AnimeParsers
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AniFlow. Демонстрационный проект.</p>
          <p>Все видео предоставляются сервисом AnimeGO. Сайт не хранит видеоматериалы.</p>
        </div>
      </div>
    </footer>
  );
}
