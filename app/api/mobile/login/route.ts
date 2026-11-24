import { NextResponse } from 'next/server';

import { createSession, toSafeUser, verifyPassword } from '@/lib/server/auth';
import { findUserByEmail, findUserByUsername } from '@/lib/server/db';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LoginBody {
  login?: string;
  password?: string;
}

/** Вход из мобильного приложения: возвращает Bearer-токен вместо cookie. */
export async function POST(request: Request) {
  if (!rateLimit(`mobile-login:${clientKey(request)}`, 10)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as LoginBody | null;
  const login = body?.login?.trim() ?? '';
  const password = body?.password ?? '';

  if (!login || !password) {
    return NextResponse.json({ error: 'Введите почту и пароль' }, { status: 400 });
  }

  const user = login.includes('@')
    ? findUserByEmail(login, 'app')
    : findUserByUsername(login, 'app');
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Неверная почта или пароль' }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'Аккаунт не подтверждён — проверьте код в письме на почту', needsVerification: true },
      { status: 403 },
    );
  }

  const session = createSession(user.id);
  return NextResponse.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: toSafeUser(user),
  });
}
