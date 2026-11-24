import { NextResponse } from 'next/server';

import { currentUser } from '@/lib/server/auth';
import { findUserByUsername } from '@/lib/server/db';
import { rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SLUG_RE = /^[A-Za-z0-9_-]{4,24}$/;

interface InviteBody {
  username?: string;
  slug?: string;
  roomName?: string;
}

/** Приглашение в комнату: push-уведомление на устройства пользователя. */
export async function POST(request: Request) {
  const host = await currentUser();
  if (!host) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  if (!rateLimit(`invite:${host.id}`, 20, 60 * 1000)) {
    return NextResponse.json({ error: 'Слишком много приглашений, подождите минуту' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as InviteBody | null;
  const username = (body?.username ?? '').trim().replace(/^@/, '').toLowerCase();
  const slug = (body?.slug ?? '').trim();

  if (!username || username.length > 24) {
    return NextResponse.json({ error: 'Укажите ник пользователя' }, { status: 400 });
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Некорректный код комнаты' }, { status: 400 });
  }

  const guest = findUserByUsername(username, 'app');
  if (!guest) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
  }

  const tokens = guest.pushTokens ?? [];
  if (!tokens.length) {
    return NextResponse.json(
      { ok: false, reason: 'no-device', message: 'У пользователя нет приложения с включёнными уведомлениями' },
      { status: 409 },
    );
  }

  const roomName = (body?.roomName ?? '').trim().slice(0, 60) || 'Совместный просмотр';
  const nick = host.profile.displayName || host.username;

  let delivered = 0;
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(
        tokens.map((to) => ({
          to,
          title: `${nick} приглашает в комнату`,
          body: roomName,
          sound: 'default',
          priority: 'high',
          channelId: 'invites',
          data: { type: 'invite', slug, from: nick },
        })),
      ),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });

    const result = (await response.json().catch(() => null)) as {
      data?: Array<{ status?: string }>;
    } | null;

    delivered = (result?.data ?? []).filter((item) => item.status === 'ok').length;
    if (!delivered && result?.data?.length) {
      return NextResponse.json({ ok: false, message: 'Push-сервис отклонил отправку' }, { status: 502 });
    }
  } catch (error) {
    console.error('[api/mobile/invite]', error);
    return NextResponse.json({ error: 'Не удалось отправить приглашение' }, { status: 502 });
  }

  if (!delivered) return NextResponse.json({ ok: true, delivered: 0, skipped: true });

  return NextResponse.json({ ok: true, delivered });
}
