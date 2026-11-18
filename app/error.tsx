'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight">Что-то сломалось</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Страница не смогла загрузиться. Обычно помогает повторная попытка.
      </p>
      <Button onClick={reset} variant="gradient">
        <RefreshCw className="h-4 w-4" />
        Попробовать снова
      </Button>
    </div>
  );
}
