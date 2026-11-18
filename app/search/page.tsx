import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Search, Sparkles } from 'lucide-react';

import { AnimeGrid } from '@/components/anime-grid';
import { DemoBanner } from '@/components/demo-banner';
import { EmptyState } from '@/components/empty-state';
import { SearchBox } from '@/components/search-box';
import { Button } from '@/components/ui/button';
import { searchAnime } from '@/lib/animego/api';

export const dynamic = 'force-dynamic';

const suggestions = [
  'Атака титанов',
  'Магическая битва',
  'Клинок, рассекающий демонов',
  'Тетрадь смерти',
  'Ванпанчмен',
  'Стальной алхимик',
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : params.q ?? '').trim();

  return {
    title: query ? `Поиск: ${query}` : 'Поиск аниме',
    description: 'Поиск аниме по названию в каталоге AnimeGO.',
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : params.q ?? '').trim();
  const data = query.length >= 2 ? await searchAnime(query, 30) : null;

  return (
    <div className="container space-y-8 py-8 lg:py-12">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Поиск по каталогу AnimeGO
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Найдите своё аниме</h1>
        <p className="text-sm text-muted-foreground">
          Введите название на русском или английском — подсказки появятся сразу.
        </p>
        <SearchBox key={query} initialQuery={query} autoFocus inputClassName="h-12 pl-10 text-base" />
      </div>

      {data?.source === 'demo' ? <DemoBanner /> : null}

      {!query ? (
        <div className="mx-auto max-w-2xl space-y-4 pt-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">Популярные запросы</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <Button key={suggestion} asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/search?q=${encodeURIComponent(suggestion)}`}>
                  <Search className="h-3.5 w-3.5" />
                  {suggestion}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      ) : query.length < 2 ? (
        <EmptyState
          title="Слишком короткий запрос"
          description="Введите хотя бы два символа, чтобы начать поиск."
          icon={<Search className="h-6 w-6" />}
        />
      ) : data && data.items.length > 0 ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">
                Результаты по запросу «{query}»
              </h2>
              <p className="text-sm text-muted-foreground">
                Найдено {data.total}{' '}
                {data.total === 1 ? 'совпадение' : data.total < 5 ? 'совпадения' : 'совпадений'}
                {data.source === 'demo' ? ' (демо-каталог)' : ''}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                На главную
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <AnimeGrid items={data.items} />
        </div>
      ) : (
        <EmptyState
          title="Ничего не найдено"
          description={`По запросу «${query}» нет результатов. Попробуйте изменить формулировку или выбрать популярный запрос.`}
          icon={<Search className="h-6 w-6" />}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/">Вернуться на главную</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
