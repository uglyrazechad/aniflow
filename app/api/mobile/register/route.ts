import { NextResponse } from 'next/server';

import {
  createSession,
  defaultProfile,
  hashPassword,
  makeUsername,
  newUserId,
  toSafeUser,
} from '@/lib/server/auth';
import { db, emailTaken, flush, type UserRecord } from '@/lib/server/db';
import { generateCode, mailLinkBase, sendMail } from '@/lib/server/mail';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

interface RegisterBody {
  email?: string;
  password?: string;
  displayName?: string;
}

/** Регистрация из мобильного приложения: сразу отдаёт Bearer-токен. */
export async function POST(request: Request) {
  if (!rateLimit(`mobile-register:${clientKey(request)}`, 6)) {
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
    emailVerified: false,
    emailCode: null,
    emailCodeExpiresAt: null,
    resetCode: null,
    resetExpiresAt: 0,
    provider: null,
    providerId: null,
    pushTokens: [],
  };

  db().users.push(user);
  flush();

  const code = generateCode();
  user.emailCode = code;
  user.emailCodeExpiresAt = Date.now() + 15 * 60 * 1000;
  flush();

  const mailResult = await sendMail({
    to: email,
    subject: 'AniHub — код подтверждения почты',
    text: `Ваш код: ${code}\nСсылка: ${mailLinkBase()}/verify-email?code=${code}&email=${encodeURIComponent(email)}`,
  });
  if (mailResult.error === 'SMTP_NOT_CONFIGURED') {
    user.emailVerified = true;
    user.emailCode = null;
    user.emailCodeExpiresAt = null;
    flush();
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { needsVerification: true, email, message: 'Код подтверждения отправлен на почту' },
      { status: 202 },
    );
  }

  const session = createSession(user.id);
  return NextResponse.json(
    { token: session.token, expiresAt: session.expiresAt, user: toSafeUser(user) },
    { status: 201 },
  );
}
