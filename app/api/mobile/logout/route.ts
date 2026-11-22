import { NextResponse } from 'next/server';

import { removeSession } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Выход из мобильного приложения: гасит Bearer-сессию. */
export async function POST(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token) removeSession(token);

  return NextResponse.json({ ok: true });
}
