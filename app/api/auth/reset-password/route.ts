import { NextResponse } from 'next/server';

import { db, flush } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/auth';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

interface ResetBody {
  code?: string;
  newPassword?: string;
}

export async function POST(request: Request) {
  if (!rateLimit(`reset:${clientKey(request)}`, 5)) {
    return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as ResetBody | null;
  const code = body?.code?.trim() ?? '';
  const newPassword = body?.newPassword ?? '';

  if (!code) {
    return NextResponse.json({ error: 'Введите код' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Пароль должен быть не короче 6 символов' }, { status: 400 });
  }

  const user = db().users.find(
    (item) => item.resetCode === code && (item.resetExpiresAt ?? 0) > Date.now(),
  );
  if (!user) {
    return NextResponse.json({ error: 'Неверный или истёк код сброса' }, { status: 400 });
  }

  user.passwordHash = hashPassword(newPassword);
  user.resetCode = null;
  user.resetExpiresAt = 0;
  flush();

  return NextResponse.json({ ok: true });
}
