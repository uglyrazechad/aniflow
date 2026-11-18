'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  FlaskConical,
  Languages,
  ListVideo,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { VideoPlayer } from '@/components/player/video-player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AnimeDetails, PlayerPayload, TranslationOption } from '@/types/anime';
import { cn } from '@/lib/utils';

interface PlayerSectionProps {
  anime: AnimeDetails;
  translations: TranslationOption[];
  isDemo: boolean;
}

export function PlayerSection({ anime, translations, isDemo }: PlayerSectionProps) {
  const seasons = anime.seasons ?? [];
  const initialSeason = seasons[0]?.season ?? 1;
  const initialEpisode = seasons[0]?.episodes?.[0]?.episode ?? 1;

  const [season, setSeason] = useState(initialSeason);
  const [episode, setEpisode] = useState(initialEpisode);
  const [translationId, setTranslationId] = useState(translations[0]?.id ?? 0);
  const [payload, setPayload] = useState<PlayerPayload | null>(null);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [autoNext, setAutoNext] = useState(false);

  const translation = translations.find((item) => item.id === translationId) ?? translations[0];
  const totalEpisodes = seasons.reduce((sum, item) => sum + item.episodes.length, 0);
  const currentSeason = seasons.find((item) => item.season === season);

  // Загрузка потока для выбранной озвучки / серии.
  useEffect(() => {
    if (isDemo) return;

    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);
    setPayload(null);

    const params = new URLSearchParams({ id: anime.id, episode: String(episode) });
    if (translationId) params.set('translation', String(translationId));

    const load = async () => {
      try {
        const response = await fetch(`/api/player?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = (await response.json().catch(() => ({}))) as
          | PlayerPayload
          | { error?: string };

        if (!response.ok) {
          throw new Error(('error' in data && data.error) || 'Не удалось получить поток');
        }

        if (cancelled) return;

        const next = data as PlayerPayload;
        setPayload(next);

        // Сервер мог выбрать другую озвучку, если запрошенная недоступна.
        if (next.translation && next.translation.id !== translationId) {
          setTranslationId(next.translation.id);
        }
      } catch (requestError) {
        if (cancelled || (requestError as Error).name === 'AbortError') return;
        setError((requestError as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [anime.id, episode, translationId, isDemo, reloadKey]);

  const nextEpisode = useMemo(() => {
    const seasonIndex = seasons.findIndex((item) => item.season === season);
    if (seasonIndex === -1) return null;

    const episodes = seasons[seasonIndex].episodes;
    const episodeIndex = episodes.findIndex((item) => item.episode === episode);

    if (episodeIndex >= 0 && episodes[episodeIndex + 1]) {
      return { season, episode: episodes[episodeIndex + 1].episode };
    }

    const nextSeason = seasons[seasonIndex + 1];
    if (nextSeason?.episodes[0]) {
      return { season: nextSeason.season, episode: nextSeason.episodes[0].episode };
    }

    return null;
  }, [seasons, season, episode]);

  const handleEnded = useCallback(() => {
    if (!nextEpisode) {
      toast.info('Это была последняя доступная серия');
      return;
    }

    setAutoNext(true);
    setSeason(nextEpisode.season);
    setEpisode(nextEpisode.episode);
    toast.success(`Серия ${nextEpisode.episode}`);
  }, [nextEpisode]);

  const playerKey = `${anime.id}-${episode}-${translationId}-${reloadKey}`;

  return (
    <section id="player" className="scroll-mt-24 space-y-4">
      {/* Плеер */}
      {isDemo ? (
        <DemoPlayer anime={anime} />
      ) : error ? (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <p className="max-w-lg text-sm text-muted-foreground">{error}</p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setReloadKey((key) => key + 1)}
              disabled={loading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Повторить
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="#episodes">Выбрать другую серию</a>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Если ошибка повторяется, проверьте доступность AnimeGO и зеркало в ANIMEGO_MIRROR.
          </p>
        </div>
      ) : loading || !payload ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-card">
          <Skeleton className="h-full w-full rounded-none" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Получаем поток…
          </div>
        </div>
      ) : (
        <VideoPlayer
          key={playerKey}
          title={anime.title}
          subtitle={totalEpisodes > 1 ? `Серия ${episode}` : undefined}
          poster={anime.posterUrl}
          src={payload.stream.src}
          type={payload.stream.type}
          autoPlay={autoNext}
          onEnded={handleEnded}
        />
      )}

      {/* Панель настроек */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/50 p-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isDemo || translations.length === 0}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Languages className="h-4 w-4 shrink-0 text-primary" />
              <span className="hidden text-xs text-muted-foreground sm:inline">Озвучка</span>
              <span className="max-w-[9rem] truncate font-medium">
                {translation?.title ?? 'Недоступно'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Озвучка</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {translations.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => {
                  setAutoNext(false);
                  setTranslationId(item.id);
                }}
                className={cn(
                  'justify-between',
                  item.id === translation?.id && 'bg-primary/10 text-primary',
                )}
              >
                <span className="truncate">{item.title}</span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  {item.type === 'voice' ? 'войс' : 'сабы'}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1.5">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isDemo ? 'bg-amber-400' : 'bg-teal-400',
              )}
            />
            {isDemo ? 'Демо' : 'AnimeGO'}
          </Badge>
          <span className="hidden sm:inline">
            {totalEpisodes > 1 ? `${totalEpisodes} серий` : 'Плеер AnimeGO'}
          </span>
        </div>
      </div>

      {/* Эпизоды */}
      {seasons.length > 0 && totalEpisodes > 1 ? (
        <div id="episodes" className="scroll-mt-24 rounded-2xl border border-border/60 bg-card/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ListVideo className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Серии</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {currentSeason?.episodes.length ?? 0} в сезоне
            </span>
          </div>

          {seasons.length > 1 ? (
            <Tabs value={String(season)} onValueChange={(value) => setSeason(Number(value))}>
              <TabsList className="mb-3 flex h-auto flex-wrap justify-start">
                {seasons.map((item) => (
                  <TabsTrigger key={item.season} value={String(item.season)}>
                    {item.title ?? `Сезон ${item.season}`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}

          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-12">
            {(currentSeason?.episodes ?? []).map((item) => {
              const active = item.episode === episode;
              return (
                <button
                  key={item.episode}
                  type="button"
                  onClick={() => {
                    setAutoNext(false);
                    setEpisode(item.episode);
                    document.getElementById('player')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title={item.title}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-lg border text-sm font-medium transition-all',
                    active
                      ? 'border-transparent bg-gradient-to-br from-brand-500 to-primary text-primary-foreground shadow-[0_8px_20px_-10px_hsl(var(--primary)/0.9)]'
                      : 'border-border/70 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {item.episode}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DemoPlayer({ anime }: { anime: AnimeDetails }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-card">
      {anime.posterUrl ? (
        <img
          src={anime.posterUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-20 blur-md"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/40" />

      <div className="relative flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <FlaskConical className="h-6 w-6" />
        </span>
        <h3 className="text-lg font-semibold">Плеер в демо-режиме</h3>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          AnimeGO сейчас недоступен, поэтому поток получить нельзя. Всё остальное — каталог,
          карточки, навигация — работает как обычно.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Button size="sm" variant="gradient" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Проверить снова
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="https://animego.me/" target="_blank" rel="noreferrer">
              Открыть AnimeGO
            </a>
          </Button>
        </div>
        <p className="pt-1 text-[11px] text-muted-foreground/70">
          При необходимости укажите рабочее зеркало в{' '}
          <code className="rounded bg-muted px-1 py-0.5">ANIMEGO_MIRROR</code> внутри{' '}
          <code className="rounded bg-muted px-1 py-0.5">.env.local</code>.
        </p>
      </div>
    </div>
  );
}
