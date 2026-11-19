import { NextResponse } from 'next/server';

import {
  createSession,
  setSessionCookie,
  toSafeUser,
  verifyPassword,
} from '@/lib/server/auth';
import { findUserByEmail, findUserByUsername } from '@/lib/server/db';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

interface LoginBody {
  login?: string;
  password?: string;
}

export async function POST(request: Request) {
  if (!rateLimit(`login:${clientKey(request)}`, 10)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as LoginBody | null;
  const login = body?.login?.trim() ?? '';
  const password = body?.password ?? '';

  if (!login || !password) {
    return NextResponse.json({ error: 'Введите почту и пароль' }, { status: 400 });
  }

  const user = login.includes('@') ? findUserByEmail(login) : findUserByUsername(login);

  // Одинаковый ответ на неверную почту и пароль — чтобы не подсказывать, что аккаунт есть.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Неверная почта или пароль' }, { status: 401 });
  }

  const session = createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);

  return NextResponse.json({ user: toSafeUser(user) });
}
