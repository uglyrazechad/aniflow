'use client';

import { motion } from 'framer-motion';

import { AnimeCard } from '@/components/anime-card';
import type { AnimeSummary } from '@/types/anime';
import { cn } from '@/lib/utils';

const gridClassName =
  'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function AnimeGrid({
  items,
  className,
}: {
  items: AnimeSummary[];
  className?: string;
}) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={cn(gridClassName, className)}
    >
      {items.map((anime) => (
        <motion.div key={anime.id} variants={item} className="h-full">
          <AnimeCard anime={anime} />
        </motion.div>
      ))}
    </motion.div>
  );
}
