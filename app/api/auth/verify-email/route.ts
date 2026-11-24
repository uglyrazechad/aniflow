import { NextResponse } from 'next/server';

import { createSession, setSessionCookie, toSafeUser } from '@/lib/server/auth';
import { findUserByEmail, flush } from '@/lib/server/db';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

interface VerifyBody {
  email?: string;
  code?: string;
}

export async function POST(request: Request) {
  if (!rateLimit(`verify:${clientKey(request)}`, 10)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as VerifyBody | null;
  const email = body?.email?.trim().toLowerCase() ?? '';
  const code = body?.code?.trim() ?? '';

  if (!email || !code) {
    return NextResponse.json({ error: 'Введите почту и код' }, { status: 400 });
  }

  const user = findUserByEmail(email, 'any');
  if (
    !user ||
    user.emailCode !== code ||
    !user.emailCodeExpiresAt ||
    user.emailCodeExpiresAt <= Date.now()
  ) {
    return NextResponse.json({ error: 'Неверный или истёк код' }, { status: 400 });
  }

  user.emailVerified = true;
  user.emailCode = null;
  user.emailCodeExpiresAt = null;
  flush();

  /* Аккаунт приложения подтверждаем, но cookie сайта ему не выдаём. */
  if (user.space !== 'app') {
    const session = createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);
  }

  return NextResponse.json({ user: toSafeUser(user), verified: true });
}
