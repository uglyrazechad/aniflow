import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Heart, Pencil, PlayCircle } from 'lucide-react';

import { AnimeGrid } from '@/components/anime-grid';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import { currentUser, findUser } from '@/lib/server/auth';
import { backgroundStyle } from '@/lib/profile-themes';
import type { AnimeSummary } from '@/types/anime';

export const dynamic = 'force-dynamic';

interface UserPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  const user = findUser(username);
  if (!user) return { title: 'Профиль не найден' };

  return { title: user.profile.displayName };
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params;
  const user = findUser(username);
  if (!user) notFound();

  const viewer = await currentUser();
  const isOwner = viewer?.id === user.id;

  const favorites: AnimeSummary[] = [...user.favorites]
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((item) => ({
      id: item.id,
      title: item.title,
      posterUrl: item.posterUrl,
      year: item.year,
      rating: item.rating,
    }));

  const inProgress = Object.values(user.progress).filter((item) => item.position > 5).length;

  return (
    <div className="container max-w-6xl space-y-8 py-6 lg:py-8">
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/40">
        <div
          className="relative h-40 bg-cover bg-center sm:h-60"
          style={backgroundStyle(user.profile.background)}
        >
          {user.profile.bannerUrl ? (
            <img
              src={user.profile.bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />
        </div>

        <div className="relative -mt-14 flex flex-col gap-5 px-5 pb-6 sm:-mt-16 sm:flex-row sm:items-end sm:px-8">
          <Avatar
            src={user.profile.avatarUrl}
            name={user.profile.displayName}
            accent={user.profile.accent}
            className="h-28 w-28 border-4 border-background shadow-2xl sm:h-32 sm:w-32"
          />

          <div className="min-w-0 flex-1 space-y-1.5 sm:pb-1">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
              {user.profile.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.profile.bio ? (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {user.profile.bio}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-primary" />
                {favorites.length} в избранном
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PlayCircle className="h-3.5 w-3.5 text-primary" />
                {inProgress} смотрю
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                с {new Date(user.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>

          {isOwner ? (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/profile">
                <Pencil className="h-3.5 w-3.5" />
                Редактировать
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {favorites.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Избранное</h2>
          <AnimeGrid items={favorites} />
        </section>
      ) : (
        <p className="rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          Пока пусто: избранное появится здесь, когда пользователь добавит тайтлы.
        </p>
      )}
    </div>
  );
}
