import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Clock, Film, Layers, Play, Star, Tv } from 'lucide-react';

import { DemoBanner } from '@/components/demo-banner';
import { ErrorState, RetryLink } from '@/components/error-state';
import { FavoriteButton } from '@/components/favorite-button';
import { WatchTogetherButton } from '@/components/watch-together-button';
import { PlayerSection } from '@/components/player/player-section';
import { Poster } from '@/components/poster';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimeGoError, getAnimeDetails, getTranslationsForAnime } from '@/lib/animego/api';
import {
  formatDuration,
  formatRating,
  formatYear,
  isDemoId,
  plainText,
  statusLabel,
  typeLabel,
} from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface AnimePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string; episode?: string }>;
}

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const anime = await getAnimeDetails(id);
    if (!anime) return { title: 'Аниме не найдено' };

    const description = plainText(anime.description)?.slice(0, 160);

    return {
      title: anime.title,
      description:
        description ||
        `${anime.title}${anime.year ? ` (${anime.year})` : ''} — смотреть онлайн в AniHub.`,
      openGraph: {
        title: anime.title,
        description,
        images: anime.posterUrl ? [{ url: anime.posterUrl }] : undefined,
      },
    };
  } catch {
    return { title: 'Аниме' };
  }
}

export default async function AnimePage({ params, searchParams }: AnimePageProps) {
  const { id } = await params;
  const { season: seasonParam, episode: episodeParam } = await searchParams;

  const toInt = (value?: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
  };

  let anime: Awaited<ReturnType<typeof getAnimeDetails>> = null;
  let error: string | null = null;

  try {
    anime = await getAnimeDetails(id);
  } catch (requestError) {
    if (requestError instanceof AnimeGoError && requestError.kind === 'notfound') notFound();
    error = requestError instanceof Error ? requestError.message : 'Не удалось загрузить тайтл';
  }

  if (!error && !anime) notFound();

  if (error || !anime) {
    return (
      <div className="container py-16">
        <ErrorState
          title="Не удалось открыть тайтл"
          description={error ?? 'AnimeGO не вернул данные об этом материале.'}
          action={<RetryLink />}
        />
      </div>
    );
  }

  const translations = await getTranslationsForAnime(anime);
  const demo = isDemoId(anime.id);
  const rating = formatRating(anime.rating);
  const status = statusLabel(anime.status);
  const duration = formatDuration(anime.duration);
  const description = plainText(anime.description);

  const facts = [
    { icon: Tv, label: 'Тип', value: typeLabel(anime.type) },
    anime.year ? { icon: Calendar, label: 'Год', value: String(anime.year) } : null,
    anime.episodesTotal && anime.episodesTotal > 1
      ? { icon: Layers, label: 'Эпизоды', value: String(anime.episodesTotal) }
      : null,
    duration ? { icon: Clock, label: 'Длительность', value: duration } : null,
    anime.studios?.length
      ? { icon: Film, label: 'Студия', value: anime.studios.join(', ') }
      : null,
    anime.minimalAge ? { icon: Star, label: 'Возраст', value: `${anime.minimalAge}+` } : null,
  ].filter(Boolean) as { icon: typeof Tv; label: string; value: string }[];

  return (
    <div className="container space-y-8 py-6 lg:py-8">
      {demo ? <DemoBanner /> : null}

      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">
          Главная
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <Link href="/search" className="transition-colors hover:text-foreground">
          Каталог
        </Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="line-clamp-1 text-foreground/80">{anime.title}</span>
      </nav>

      {/* Шапка тайтла */}
      <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <div className="relative">
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-brand-500/30 to-brand-300/20 blur-xl" />
          <Poster
            src={anime.posterUrl}
            alt={`Постер «${anime.title}»`}
            title={anime.title}
            eager
            className="relative aspect-[2/3] w-full rounded-2xl border border-border/60 shadow-2xl"
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {rating ? (
              <Badge className="gap-1.5 py-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating}
                <span className="text-[10px] text-muted-foreground">
                  {anime.ratingSource === 'animego'
                    ? 'AnimeGO'
                    : anime.ratingSource === 'shikimori'
                      ? 'Shikimori'
                      : anime.ratingSource === 'kinopoisk'
                        ? 'Кинопоиск'
                        : anime.ratingSource === 'imdb'
                          ? 'IMDb'
                          : ''}
                </span>
              </Badge>
            ) : null}
            {status ? <Badge variant="success">{status}</Badge> : null}
            {demo ? <Badge variant="warning">демо</Badge> : null}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {anime.title}
            </h1>
            {anime.titleOrig ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{anime.titleOrig}</p>
            ) : null}
          </div>

          {anime.genres?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {anime.genres.slice(0, 6).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-border/70 bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          {description ? (
            <p className="line-clamp-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:line-clamp-5">
              {description}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button asChild variant="gradient">
              <a href="#player">
                <Play className="h-4 w-4 fill-current" />
                Смотреть
              </a>
            </Button>
            <WatchTogetherButton animeId={anime.id} />
            <Button asChild variant="outline">
              <Link href={`/search?q=${encodeURIComponent(anime.titleOrig || anime.title)}`}>
                Похожие тайтлы
              </Link>
            </Button>
            <FavoriteButton
              anime={{
                id: anime.id,
                title: anime.title,
                posterUrl: anime.posterUrl,
                year: anime.year,
                rating: anime.rating,
              }}
            />
            <span className="text-xs text-muted-foreground">
              {translations.length > 1 ? `${translations.length} озвучки` : 'Озвучка AnimeGO'}
            </span>
          </div>
        </div>
      </div>

      <PlayerSection
        anime={anime}
        translations={translations}
        isDemo={demo}
        initialSeason={toInt(seasonParam)}
        initialEpisode={toInt(episodeParam)}
      />

      {/* Факты */}
      {facts.length ? (
        <section className="rounded-2xl border border-border/60 bg-card/50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">О тайтле</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <fact.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                  <dd className="truncate text-sm font-medium">{fact.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Данные и видео предоставляются сервисом AnimeGO. AniHub не хранит видеоматериалы и не
        размещает собственный контент. Если плеер не запускается, попробуйте сменить озвучку или
        серию.
      </p>
    </div>
  );
}
