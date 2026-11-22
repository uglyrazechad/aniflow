import { NextResponse } from 'next/server';

import { CATALOG_GENRES, CATALOG_STATUSES, loadCatalog } from '@/lib/animego/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

/** Каталог для мобильного приложения: жанр, год (сезон) или статус + пагинация. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const page = await loadCatalog({
      genre: searchParams.get('genre') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      year: searchParams.get('year') ? toPositiveInt(searchParams.get('year'), 0) : undefined,
      page: toPositiveInt(searchParams.get('page'), 1),
      limit: toPositiveInt(searchParams.get('limit'), 24),
    });

    return NextResponse.json(
      { ...page, genres: CATALOG_GENRES, statuses: CATALOG_STATUSES },
      { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } },
    );
  } catch (error) {
    console.error('[api/catalog]', error);
    return NextResponse.json({ error: 'Каталог временно недоступен' }, { status: 502 });
  }
}
