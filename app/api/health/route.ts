import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Проверка живости для Render/Koyeb/Docker — не ходит в AnimeGO. */
export function GET() {
  return NextResponse.json(
    { ok: true, uptime: Math.round(process.uptime()) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
