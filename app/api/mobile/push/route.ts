import { NextResponse } from 'next/server';

import { currentUser } from '@/lib/server/auth';
import { flush } from '@/lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPO_TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,}\]$/;
const MAX_TOKENS = 5;

/** Регистрация Expo push-токена устройства. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim() ?? '';

  if (!EXPO_TOKEN_RE.test(token)) {
    return NextResponse.json({ error: 'Некорректный push-токен' }, { status: 400 });
  }

  const tokens = (user.pushTokens ?? []).filter((item) => item !== token);
  tokens.push(token);
  user.pushTokens = tokens.slice(-MAX_TOKENS);
  flush();

  return NextResponse.json({ ok: true, tokens: user.pushTokens.length });
}

/** Удаление токена (выход из аккаунта на устройстве). */
export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim() ?? '';

  user.pushTokens = (user.pushTokens ?? []).filter((item) => item !== token);
  flush();

  return NextResponse.json({ ok: true });
}
