'use client';

import { Users } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

interface Props {
  animeId: string | number;
  episode?: number;
}

export function WatchTogetherButton({ animeId, episode = 1 }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const startRoom = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeId, episode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.slug) throw new Error('Не удалось создать комнату');
      router.push(`/room/${data.slug}`);
    } catch {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" disabled={busy} onClick={() => void startRoom()}>
      <Users className="h-4 w-4" />
      {busy ? 'Создаём…' : 'Смотреть вместе'}
    </Button>
  );
}
