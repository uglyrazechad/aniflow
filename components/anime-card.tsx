'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Star } from 'lucide-react';

import { Poster } from '@/components/poster';
import { Badge } from '@/components/ui/badge';
import type { AnimeSummary } from '@/types/anime';
import { cn, formatRating, formatYear, typeLabel } from '@/lib/utils';

interface AnimeCardProps {
  anime: AnimeSummary;
  rank?: number;
}

export function AnimeCard({ anime, rank }: AnimeCardProps) {
  const rating = formatRating(anime.rating);
  const meta = [
    formatYear(anime.year),
    typeLabel(anime.type),
    anime.episodesTotal ? `${anime.episodesTotal} эп.` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative h-full"
    >
      {/* Свечение под карточкой */}
      <div className="pointer-events-none absolute -inset-1 rounded-[1.4rem] bg-gradient-to-br from-brand-500/45 via-primary/20 to-brand-300/40 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

      <Link
        href={`/anime/${anime.id}`}
        className="relative block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-card transition-shadow duration-500 group-hover:shadow-xl">
          <Poster
            src={anime.posterUrl}
            alt={`Постер «${anime.title}»`}
            title={anime.title}
            className="h-full w-full"
            imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />

          {/* Затемнение снизу для читаемости бейджей */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/25 opacity-80" />

          {rating ? (
            <Badge variant="glass" className="absolute left-2 top-2 gap-1 px-2 py-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-semibold text-white">{rating}</span>
            </Badge>
          ) : null}

          {anime.quality ? (
            <span className="absolute right-2 top-2 hidden rounded-full border border-white/15 bg-black/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/80 backdrop-blur-md sm:block">
              {anime.quality.replace(/^(BDRip|WEB-DL|WEBRip|HDRip|DVDRip)\s*/i, '')}
            </span>
          ) : null}

          {/* Play-кнопка на ховере */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
              <Play className="h-5 w-5 translate-x-px fill-white" />
            </span>
          </div>

          {anime.translations && anime.translations.length > 1 ? (
            <span className="absolute bottom-2 right-2 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[10px] text-white/75 backdrop-blur-md">
              {anime.translations.length} озвучки
            </span>
          ) : null}

          {rank ? (
            <span
              className={cn(
                'absolute bottom-2 left-2 flex h-8 min-w-8 items-center justify-center rounded-xl border px-1.5 text-sm font-black tabular-nums backdrop-blur-md',
                rank <= 3
                  ? 'border-amber-200/50 bg-gradient-to-br from-amber-300 to-orange-500 text-black shadow-[0_6px_20px_-6px_rgba(251,191,36,0.9)]'
                  : 'border-white/15 bg-black/60 text-white',
              )}
              aria-label={`Место ${rank}`}
            >
              {rank}
            </span>
          ) : null}
        </div>

        <div className="mt-3 space-y-1 px-0.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {anime.title}
          </h3>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
      </Link>
    </motion.div>
  );
}
