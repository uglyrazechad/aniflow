import { NextResponse } from 'next/server';

import { getAnimeDetails, getTranslationsForAnime } from '@/lib/animego/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Тайтл для мобильного приложения: детали, серии и список озвучек. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!/^[a-z0-9-]+-\d+$/i.test(id) && !id.startsWith('demo-')) {
    return NextResponse.json({ error: 'Некорректный id материала' }, { status: 400 });
  }

  try {
    const anime = await getAnimeDetails(id);
    if (!anime) {
      return NextResponse.json({ error: 'Тайтл не найден' }, { status: 404 });
    }

    const translations = await getTranslationsForAnime(anime);

    return NextResponse.json(
      { anime: { ...anime, translations }, translations },
      { headers: { 'Cache-Control': 'public, max-age=120, s-maxage=600' } },
    );
  } catch (error) {
    console.error('[api/anime]', id, error);
    return NextResponse.json({ error: 'Тайтл временно недоступен' }, { status: 502 });
  }
}
