'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, Dices, Info, Play, Star, Tv } from 'lucide-react';

import { Poster } from '@/components/poster';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AnimeSummary } from '@/types/anime';
import { formatRating, formatYear, typeLabel } from '@/lib/utils';

interface HeroProps {
  anime?: AnimeSummary;
}

export function Hero({ anime }: HeroProps) {
  if (!anime) return null;

  const rating = formatRating(anime.rating);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/40">
      {/* Размытый постер как фон */}
      <div className="absolute inset-0">
        {anime.posterUrl ? (
          <img
            src={anime.posterUrl}
            alt=""
            aria-hidden
            className="h-full w-full scale-110 object-cover opacity-25 blur-2xl"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-900/60 via-background to-teal-900/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="absolute -left-24 top-1/3 h-64 w-64 rounded-full bg-primary/20 blur-[90px] animate-pulse-soft" />
        <div className="absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-teal-500/15 blur-[80px] animate-pulse-soft" />
      </div>

      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center lg:p-12">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center gap-2"
          >
            <Badge variant="default" className="gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              В тренде AnimeGO
            </Badge>
            {rating ? (
              <Badge variant="outline" className="gap-1 border-border/80 bg-background/40">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating}
              </Badge>
            ) : null}
            <Badge variant="outline" className="gap-1 border-border/80 bg-background/40">
              <Calendar className="h-3 w-3" />
              {formatYear(anime.year)}
            </Badge>
            <Badge variant="outline" className="gap-1 border-border/80 bg-background/40">
              <Tv className="h-3 w-3" />
              {typeLabel(anime.type)}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="mt-5 text-balance text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl"
          >
            {anime.title}
          </motion.h1>

          {anime.titleOrig ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-2 line-clamp-1 text-sm text-muted-foreground"
            >
              {anime.titleOrig}
            </motion.p>
          ) : null}

          {anime.genres?.length ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="mt-5 flex flex-wrap gap-2"
            >
              {anime.genres.slice(0, 4).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs text-muted-foreground"
                >
                  {genre}
                </span>
              ))}
            </motion.div>
          ) : null}

          {anime.description ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 line-clamp-3 max-w-xl text-sm leading-relaxed text-muted-foreground"
            >
              {anime.description}
            </motion.p>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <Button asChild size="lg" variant="gradient" className="group">
              <Link href={`/anime/${anime.id}#player`}>
                <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
                Смотреть
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="backdrop-blur-sm">
              <Link href={`/anime/${anime.id}`}>
                <Info className="h-4 w-4" />
                Подробнее
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="backdrop-blur-sm">
              <Link href="/random" prefetch={false}>
                <Dices className="h-4 w-4" />
                Случайное
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Постер */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto hidden w-full max-w-[240px] lg:block"
        >
          <div className="absolute -inset-3 rounded-[1.6rem] bg-gradient-to-br from-brand-500/40 to-teal-400/30 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            <Poster
              src={anime.posterUrl}
              alt={`Постер «${anime.title}»`}
              title={anime.title}
              eager
              className="aspect-[2/3] w-full"
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
