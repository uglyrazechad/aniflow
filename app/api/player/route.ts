import { NextResponse } from 'next/server';

import { getPlayerPayload, AnimeGoError } from '@/lib/animego/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';

  if (!/^[a-z0-9-]+-\d+$/i.test(id)) {
    return NextResponse.json({ error: 'Некорректный id материала' }, { status: 400 });
  }

  const episode = toPositiveInt(searchParams.get('episode'), 1);
  const translationParam = searchParams.get('translation');
  const translation = translationParam ? toPositiveInt(translationParam, 0) : undefined;

  try {
    const payload = await getPlayerPayload({ id, episode, translation });
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, max-age=120' },
    });
  } catch (error) {
    console.error('[api/player]', error);
    const message =
      error instanceof AnimeGoError
        ? error.message
        : 'Не удалось получить ссылку на видео. Попробуйте другую озвучку или серию.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
