import { NextResponse } from 'next/server';

import {
  createSession,
  createSocialUser,
  setSessionCookie,
} from '@/lib/server/auth';
import { findUserByEmail, findUserByProvider } from '@/lib/server/db';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

interface YandexUserInfo {
  id?: string | number;
  login?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export async function GET(request: Request) {
  if (!rateLimit(`yandex:${clientKey(request)}`, 10)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Нет кода авторизации' }, { status: 400 });
  }

  const clientId = process.env.YANDEX_CLIENT_ID?.trim();
  const clientSecret = process.env.YANDEX_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Яндекс OAuth не настроен' }, { status: 500 });
  }

  const redirectUri =
    process.env.YANDEX_REDIRECT_URI ??
    `${new URL(request.url).origin}/api/auth/yandex/callback`;

  const tokenRes = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  const token = await tokenRes.json().catch(() => null) as { access_token?: string } | null;
  if (!tokenRes.ok || !token?.access_token) {
    return NextResponse.json({ error: 'Не удалось получить токен' }, { status: 502 });
  }

  const meRes = await fetch('https://oauth.yandex.ru/me', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const me = (await meRes.json().catch(() => null)) as YandexUserInfo | null;
  if (!meRes.ok || !me?.id) {
    return NextResponse.json({ error: 'Не удалось получить профиль' }, { status: 502 });
  }

  const email = me.email || `${me.login}@yandex.ru`;
  const providerId = String(me.id ?? me.login);
  const displayName =
    [me.first_name, me.last_name].filter(Boolean).join(' ').trim() ||
    me.login ||
    email.split('@')[0];

  let user = findUserByProvider('yandex', providerId) ?? findUserByEmail(email);
  if (!user) user = createSocialUser('yandex', providerId, email, displayName);

  const session = createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);

  return NextResponse.redirect(new URL('/', request.url), 302);
}
