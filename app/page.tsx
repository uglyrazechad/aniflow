import Link from 'next/link';
import { ArrowRight, Compass, Search } from 'lucide-react';

import { AnimeSection } from '@/components/anime-section';
import { ContinueWatching } from '@/components/continue-watching';
import { DemoBanner } from '@/components/demo-banner';
import { EmptyState } from '@/components/empty-state';
import { Hero } from '@/components/hero';
import { Button } from '@/components/ui/button';
import { loadHome } from '@/lib/animego/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const home = await loadHome();

  return (
    <div className="container space-y-10 py-6 lg:space-y-12 lg:py-8">
      {home.source === 'demo' ? <DemoBanner className="animate-fade-in" /> : null}

      <Hero anime={home.featured} />

      <ContinueWatching />

      {home.sections.length ? (
        <div className="space-y-12 lg:space-y-16">
          {home.sections.map((section) => (
            <AnimeSection
              key={section.key}
              id={section.key}
              title={section.title}
              subtitle={section.subtitle}
              href={section.href}
              items={section.items}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Каталог пока пуст"
          description="AnimeGO не вернул материалы. Попробуйте обновить страницу или воспользоваться поиском."
          icon={<Compass className="h-6 w-6" />}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/search">Перейти к поиску</Link>
            </Button>
          }
        />
      )}

      {/* Поисковая подсказка */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-brand-500/10 via-card/40 to-brand-300/10 p-6 sm:p-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold sm:text-2xl">Не нашли нужный тайтл?</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Поиск работает по названию и оригинальному имени. Нажмите{' '}
              <kbd className="rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[10px]">
                Ctrl K
              </kbd>{' '}
              и начните вводить название.
            </p>
          </div>
          <Button asChild variant="gradient" size="lg">
            <Link href="/search">
              <Search className="h-4 w-4" />
              Открыть поиск
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
