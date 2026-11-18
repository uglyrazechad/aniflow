import { NextResponse } from 'next/server';

import { searchAnime } from '@/lib/animego/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim().slice(0, 120);

  const requestedLimit = Number(searchParams.get('limit') ?? '12');
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 30)
    : 12;

  if (query.length < 2) {
    return NextResponse.json({ items: [], total: 0, source: 'animego' });
  }

  try {
    const result = await searchAnime(query, limit);
    return NextResponse.json(
      { items: result.items, total: result.total, source: result.source },
      { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' } },
    );
  } catch (error) {
    console.error('[api/search]', error);
    return NextResponse.json(
      { error: 'Поиск временно недоступен', items: [], total: 0, source: 'animego' },
      { status: 502 },
    );
  }
}
