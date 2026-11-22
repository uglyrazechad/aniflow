import { NextResponse } from 'next/server';

import { findUserByEmail, flush } from '@/lib/server/db';
import { generateCode, mailLinkBase, sendMail } from '@/lib/server/mail';

interface ResendBody {
  email?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ResendBody | null;
  const email = body?.email?.trim().toLowerCase() ?? '';

  if (!email) {
    return NextResponse.json({ error: 'Введите почту' }, { status: 400 });
  }

  const user = findUserByEmail(email);
  if (user && !user.emailVerified) {
    const code = generateCode();
    user.emailCode = code;
    user.emailCodeExpiresAt = Date.now() + 15 * 60 * 1000;
    flush();
    await sendMail({
      to: user.email,
      subject: 'AniHub — код подтверждения почты',
      text: `Ваш код: ${code}\nСсылка: ${mailLinkBase()}/verify-email?code=${code}&email=${encodeURIComponent(email)}`,
    });
  }

  return NextResponse.json({ ok: true, verified: user?.emailVerified ?? true });
}
