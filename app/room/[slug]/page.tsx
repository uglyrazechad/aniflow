import { notFound } from 'next/navigation';

import { getAnimeDetails } from '@/lib/animego/api';
import type { AnimeLike } from '@/lib/room-types';
import { RoomPage } from '@/components/room/room-page';

export const dynamic = 'force-dynamic';

const ROOMS_SERVER =
  process.env.ROOMS_URL || `http://127.0.0.1:${process.env.ROOMS_PORT || 3000}`;

export default async function RoomSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await fetch(`${ROOMS_SERVER}/api/rooms/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  const room = await res.json().catch(() => null);
  if (!res.ok || !room?.slug) notFound();

  let anime: AnimeLike | null = null;
  if (room.animeId) {
    try {
      const details = await getAnimeDetails(room.animeId);
      if (details) anime = { id: details.id, title: details.title, posterUrl: details.posterUrl };
    } catch {
      anime = null;
    }
  }

  return (
    <RoomPage
      room={room}
      anime={{
        id: room.animeId ?? 0,
        title: anime?.title ?? room.name,
        posterUrl: anime?.posterUrl,
      }}
    />
  );
}
