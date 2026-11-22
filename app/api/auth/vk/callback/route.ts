import { NextResponse } from 'next/server';

import {
  createSession,
  createSocialUser,
  setSessionCookie,
} from '@/lib/server/auth';
import { findUserByEmail, findUserByProvider } from '@/lib/server/db';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

interface VkAccessToken {
  access_token?: string;
  user_id?: number;
  email?: string;
}

interface VkUserInfo {
  id?: number;
  first_name?: string;
  last_name?: string;
  screen_name?: string;
}

export async function GET(request: Request) {
  if (!rateLimit(`vk:${clientKey(request)}`, 10)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Нет кода авторизации' }, { status: 400 });
  }

  const clientId = process.env.VK_ID_CLIENT_ID?.trim();
  const clientSecret = process.env.VK_ID_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'ВКонтакте OAuth не настроен' }, { status: 500 });
  }

  const redirectUri =
    process.env.VK_ID_REDIRECT_URI ??
    `${new URL(request.url).origin}/api/auth/vk/callback`;

  const tokenRes = await fetch('https://oauth.vk.com/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  const token = await tokenRes.json().catch(() => null) as VkAccessToken | null;
  if (!tokenRes.ok || !token?.access_token) {
    return NextResponse.json({ error: 'Не удалось получить токен' }, { status: 502 });
  }

  const vkId = String(token.user_id ?? '');
  const usersRes = await fetch(
    `https://api.vk.com/method/users.get?user_ids=${vkId}&fields=screen_name,photo_200&v=5.131&access_token=${token.access_token}`,
  );
  const usersData = await usersRes.json().catch(() => null) as { response?: VkUserInfo[] } | null;
  const info = usersData?.response?.[0] ?? null;
  if (!vkId || !info?.id) {
    return NextResponse.json({ error: 'Не удалось получить профиль' }, { status: 502 });
  }

  const providerId = String(info.id);
  const email = token.email || `${vkId}@vk.com`;
  const displayName =
    [info.first_name, info.last_name].filter(Boolean).join(' ').trim() ||
    info.screen_name ||
    email.split('@')[0];

  let user = findUserByProvider('vk', providerId) ?? findUserByEmail(email);
  if (!user) user = createSocialUser('vk', providerId, email, displayName);

  const session = createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);

  return NextResponse.redirect(new URL('/', request.url), 302);
}
