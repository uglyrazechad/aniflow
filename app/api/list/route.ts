import { NextResponse } from 'next/server';

import { currentUser } from '@/lib/server/auth';
import { flush, type FavoriteEntry } from '@/lib/server/db';

const MAX_FAVORITES = 200;

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ items: [], authorized: false });

  return NextResponse.json({
    items: [...user.favorites].sort((a, b) => b.addedAt - a.addedAt),
    authorized: true,
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { anime?: Partial<FavoriteEntry> } | null;
  const anime = body?.anime;
  if (!anime?.id || !anime.title) {
    return NextResponse.json({ error: 'Некорректный тайтл' }, { status: 400 });
  }

  const entry: FavoriteEntry = {
    id: String(anime.id),
    title: String(anime.title).slice(0, 200),
    posterUrl: typeof anime.posterUrl === 'string' ? anime.posterUrl : undefined,
    year: typeof anime.year === 'number' ? anime.year : undefined,
    rating: typeof anime.rating === 'number' ? anime.rating : undefined,
    addedAt: Date.now(),
  };

  user.favorites = [entry, ...user.favorites.filter((item) => item.id !== entry.id)].slice(
    0,
    MAX_FAVORITES,
  );
  flush();

  return NextResponse.json({ items: user.favorites });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Не указан тайтл' }, { status: 400 });
  }

  user.favorites = user.favorites.filter((item) => item.id !== id);
  flush();

  return NextResponse.json({ items: user.favorites });
}
