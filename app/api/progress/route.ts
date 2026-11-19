import { NextResponse } from 'next/server';

import { currentUser } from '@/lib/server/auth';
import { flush } from '@/lib/server/db';
import type { WatchProgress } from '@/lib/watch-progress';

const MAX_ITEMS = 40;

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ items: [], authorized: false });

  return NextResponse.json({
    items: Object.values(user.progress).sort((a, b) => b.updatedAt - a.updatedAt),
    authorized: true,
  });
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { entry?: WatchProgress } | null;
  const entry = body?.entry;
  if (!entry?.id || typeof entry.position !== 'number') {
    return NextResponse.json({ error: 'Некорректная запись прогресса' }, { status: 400 });
  }

  const current = user.progress[entry.id];
  if (!current || current.updatedAt <= entry.updatedAt) {
    user.progress[entry.id] = { ...entry, updatedAt: entry.updatedAt || Date.now() };
  }

  const trimmed = Object.values(user.progress)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ITEMS);
  user.progress = Object.fromEntries(trimmed.map((item) => [item.id, item]));
  flush();

  return NextResponse.json({ ok: true });
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

  delete user.progress[id];
  flush();

  return NextResponse.json({ ok: true });
}
