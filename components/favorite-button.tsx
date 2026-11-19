'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  anime: {
    id: string;
    title: string;
    posterUrl?: string;
    year?: number;
    rating?: number;
  };
}

/** Сердечко «в избранное»: состояние живёт в аккаунте, для гостей ведёт на вход. */
export function FavoriteButton({ anime }: FavoriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;

    fetch('/api/list', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { items?: { id: string }[] }) => {
        if (!alive) return;
        setActive(Boolean(data.items?.some((item) => item.id === anime.id)));
      })
      .catch(() => {
        if (alive) setActive(false);
      });

    return () => {
      alive = false;
    };
  }, [anime.id]);

  const toggle = async () => {
    if (pending) return;
    setPending(true);

    try {
      const response = active
        ? await fetch(`/api/list?id=${encodeURIComponent(anime.id)}`, { method: 'DELETE' })
        : await fetch('/api/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anime }),
          });

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!response.ok) throw new Error('request failed');

      setActive((value) => !value);
      toast.success(active ? 'Убрано из избранного' : 'Добавлено в избранное');
    } catch {
      toast.error('Не удалось обновить избранное');
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void toggle()}
      disabled={pending || active === null}
      aria-pressed={Boolean(active)}
      title={active ? 'Убрать из избранного' : 'В избранное'}
    >
      {pending || active === null ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className={cn(
            'h-4 w-4 transition-colors',
            active ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground',
          )}
        />
      )}
      {active ? 'В избранном' : 'В избранное'}
    </Button>
  );
}
