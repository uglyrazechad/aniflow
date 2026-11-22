import { NextResponse } from 'next/server';

import { currentUser, toSafeUser } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Текущий пользователь по Bearer-токену (мобильное приложение). */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  return NextResponse.json({ user: toSafeUser(user) });
}
