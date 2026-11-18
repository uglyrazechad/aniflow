import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { AnimeGrid } from '@/components/anime-grid';
import type { AnimeSummary } from '@/types/anime';
import { cn } from '@/lib/utils';

interface AnimeSectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  href?: string;
  items: AnimeSummary[];
  className?: string;
}

export function AnimeSection({ id, title, subtitle, href, items, className }: AnimeSectionProps) {
  if (!items.length) return null;

  return (
    <section id={id} className={cn('scroll-mt-24 space-y-5', className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>

        {href ? (
          <Link
            href={href}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            Все
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>

      <AnimeGrid items={items} />
    </section>
  );
}
