import { NextResponse } from 'next/server';

import { findUserByEmail, flush } from '@/lib/server/db';
import { generateCode, mailLinkBase, sendMail } from '@/lib/server/mail';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

interface RequestResetBody {
  email?: string;
}

export async function POST(request: Request) {
  if (!rateLimit(`reset-request:${clientKey(request)}`, 5)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as RequestResetBody | null;
  const email = body?.email?.trim().toLowerCase() ?? '';

  if (!email) {
    return NextResponse.json({ error: 'Введите почту' }, { status: 400 });
  }

  const user = findUserByEmail(email, 'any');
  if (user && user.emailVerified) {
    const code = generateCode();
    user.resetCode = code;
    user.resetExpiresAt = Date.now() + 15 * 60 * 1000;
    flush();
    await sendMail({
      to: user.email,
      subject: 'AniHub — код сброса пароля',
      text: `Ваш код сброса: ${code}\nСсылка: ${mailLinkBase()}/auth/reset-password?code=${code}`,
    });
  }

  // Всегда возвращаем одинаковый ответ — не раскрывать, есть ли почта в базе.
  return NextResponse.json({ ok: true });
}
