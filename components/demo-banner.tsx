'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Честно сообщает, что данные демонстрационные:
 * сайт AnimeGO недоступен или изменил разметку.
 */
export function DemoBanner({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm sm:flex-row sm:items-center',
        className,
      )}
    >
      <div className="flex items-center gap-2 font-medium text-amber-300">
        <FlaskConical className="h-4 w-4 shrink-0" />
        Демо-режим
      </div>
      <p className="flex-1 text-muted-foreground">
        AnimeGO сейчас недоступен, поэтому показан встроенный каталог. Проверьте сеть или
        зеркало в{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ANIMEGO_MIRROR</code>.
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
          Повторить
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setHidden(true)}>
          Скрыть
        </Button>
      </div>
    </div>
  );
}
