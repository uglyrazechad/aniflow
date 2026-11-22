import { NextResponse } from 'next/server';

import { loadHome } from '@/lib/animego/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Главная страница для мобильного приложения: подборки + featured. */
export async function GET() {
  try {
    const home = await loadHome();
    return NextResponse.json(home, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    });
  } catch (error) {
    console.error('[api/home]', error);
    return NextResponse.json({ error: 'Каталог временно недоступен' }, { status: 502 });
  }
}
