import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heart } from 'lucide-react';

import { AnimeGrid } from '@/components/anime-grid';
import { Button } from '@/components/ui/button';
import { currentUser } from '@/lib/server/auth';
import type { AnimeSummary } from '@/types/anime';

export const metadata: Metadata = { title: 'Избранное' };
export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/favorites');

  const items: AnimeSummary[] = [...user.favorites]
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((item) => ({
      id: item.id,
      title: item.title,
      posterUrl: item.posterUrl,
      year: item.year,
      rating: item.rating,
    }));

  return (
    <div className="container space-y-6 py-6 lg:py-8">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Heart className="h-6 w-6 fill-rose-500 text-rose-500" />
          Избранное
        </h1>
        <p className="text-sm text-muted-foreground">
          Тайтлы, которые вы отметили сердечком
        </p>
      </div>

      {items.length ? (
        <AnimeGrid items={items} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card/40 px-6 py-16 text-center">
          <Heart className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Пока пусто. Откройте любой тайтл и нажмите «В избранное».
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/search">В каталог</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
