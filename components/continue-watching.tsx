'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, Play, X } from 'lucide-react';

import { Poster } from '@/components/poster';
import {
  listProgress,
  progressPercent,
  removeProgress,
  type WatchProgress,
} from '@/lib/watch-progress';
import { formatTime } from '@/lib/utils';

/** «Продолжить просмотр» — последние серии и минуты из localStorage. */
export function ContinueWatching() {
  const [items, setItems] = useState<WatchProgress[]>([]);

  useEffect(() => {
    setItems(listProgress());

    const sync = () => setItems(listProgress());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <History className="h-5 w-5 text-primary" />
            Продолжить просмотр
          </h2>
          <p className="text-sm text-muted-foreground">
            С того места, где вы остановились
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => {
          const percent = progressPercent(item);
          const episodeLabel = item.season > 1 ? `${item.season} сезон · ` : '';

          return (
            <div key={item.id} className="group relative">
              <Link
                href={`/anime/${item.id}?season=${item.season}&episode=${item.episode}`}
                className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-card">
                  <Poster
                    src={item.posterUrl}
                    alt={`Постер «${item.title}»`}
                    title={item.title}
                    className="h-full w-full"
                    imgClassName="scale-105 transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

                  <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                    <Play className="h-5 w-5 translate-x-px fill-white" />
                  </span>

                  <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-2.5">
                    <p className="text-[11px] font-medium text-white/85">
                      {episodeLabel}Серия {item.episode}
                      {item.position > 0 ? ` · ${formatTime(item.position)}` : ''}
                    </p>
                    <div className="h-1 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                  {item.title}
                </h3>
              </Link>

              <button
                type="button"
                onClick={() => {
                  removeProgress(item.id);
                  setItems(listProgress());
                }}
                title="Убрать из истории"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/70 opacity-0 backdrop-blur-md transition-opacity hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
