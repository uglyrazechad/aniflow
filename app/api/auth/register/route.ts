import { NextResponse } from 'next/server';

import {
  createSession,
  defaultProfile,
  hashPassword,
  makeUsername,
  newUserId,
  setSessionCookie,
  toSafeUser,
} from '@/lib/server/auth';
import { db, emailTaken, flush, type UserRecord } from '@/lib/server/db';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

interface RegisterBody {
  email?: string;
  password?: string;
  displayName?: string;
}

export async function POST(request: Request) {
  if (!rateLimit(`register:${clientKey(request)}`, 6)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  const email = body?.email?.trim().toLowerCase() ?? '';
  const password = body?.password ?? '';
  const displayName = body?.displayName?.trim() || email.split('@')[0] || 'Зритель';

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Укажите корректную почту' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Пароль должен быть не короче 6 символов' }, { status: 400 });
  }
  if (displayName.length > 40) {
    return NextResponse.json({ error: 'Имя длиннее 40 символов' }, { status: 400 });
  }
  if (emailTaken(email)) {
    return NextResponse.json({ error: 'Такая почта уже зарегистрирована' }, { status: 409 });
  }

  const username = makeUsername(email, (value) =>
    db().users.some((user) => user.username.toLowerCase() === value.toLowerCase()),
  );

  const user: UserRecord = {
    id: newUserId(),
    email,
    username,
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
    profile: defaultProfile(displayName),
    progress: {},
    favorites: [],
  };

  db().users.push(user);
  flush();

  const session = createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);

  return NextResponse.json({ user: toSafeUser(user) }, { status: 201 });
}
