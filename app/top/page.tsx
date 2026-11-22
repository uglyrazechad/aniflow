import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

import { AnimeGrid } from '@/components/anime-grid';
import { ErrorState, RetryLink } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { TOP_PAGES, TOP_PAGE_SIZE, TOP_TOTAL, loadTop, type TopPage } from '@/lib/animego/api';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Топ-250 аниме',
  description: 'Топ-250 AniHub — 250 лучших аниме. Подборка обновляется автоматически.',
};

const pageHref = (page: number) => (page === 1 ? '/top' : `/top?page=${page}`);

export default async function TopPageRoute({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.page) ? params.page[0] : params.page;
  const requested = Number.parseInt(raw ?? '1', 10);
  const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), TOP_PAGES);

  let data: TopPage | null = null;
  try {
    data = await loadTop(page);
  } catch (error) {
    console.warn('[anihub] топ-250 недоступен:', error);
  }

  const rankStart = (page - 1) * TOP_PAGE_SIZE + 1;
  const rankEnd = Math.min(page * TOP_PAGE_SIZE, TOP_TOTAL);

  return (
    <div className="container space-y-8 py-8 lg:space-y-10 lg:py-12">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-amber-500/15 via-card/40 to-orange-500/10 p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
            <Trophy className="h-3.5 w-3.5" />
            Топ-250 AniHub
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Топ-250{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                AniHub
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              250 лучших тайтлов AniHub. Подборка и рейтинг обновляются автоматически.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1">
              Места {rankStart}–{rankEnd} из {TOP_TOTAL}
            </span>
            <span className="rounded-full border border-border/70 bg-background/40 px-3 py-1">
              Страница {page} из {TOP_PAGES}
            </span>
          </div>
        </div>
      </section>

      {data && data.items.length ? (
        <AnimeGrid items={data.items} rankStart={rankStart} />
      ) : (
        <ErrorState
          title="Топ-250 временно недоступен"
          description="Сервис не вернул данные рейтинга. Попробуйте обновить страницу через минуту."
          action={<RetryLink />}
        />
      )}

      {data && data.items.length ? (
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Страницы топа">
          <Button asChild variant="outline" size="sm" className={cn(page === 1 && 'pointer-events-none opacity-40')}>
            <Link href={pageHref(Math.max(1, page - 1))} aria-label="Предыдущая страница">
              <ChevronLeft className="h-4 w-4" />
              Назад
            </Link>
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {Array.from({ length: TOP_PAGES }, (_, index) => index + 1).map((value) => (
              <Button
                key={value}
                asChild
                variant={value === page ? 'default' : 'outline'}
                size="icon-sm"
                className={cn('tabular-nums', value === page && 'pointer-events-none')}
              >
                <Link href={pageHref(value)} aria-current={value === page ? 'page' : undefined}>
                  {value}
                </Link>
              </Button>
            ))}
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(page === TOP_PAGES && 'pointer-events-none opacity-40')}
          >
            <Link href={pageHref(Math.min(TOP_PAGES, page + 1))} aria-label="Следующая страница">
              Вперёд
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
