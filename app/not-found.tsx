import Link from 'next/link';
import { Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <Compass className="h-7 w-7" />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">Страница потерялась</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Такого тайтла нет в каталоге, либо ссылка устарела. Попробуйте найти его через поиск.
      </p>
      <div className="flex gap-2 pt-2">
        <Button asChild variant="gradient">
          <Link href="/">На главную</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/search">Открыть поиск</Link>
        </Button>
      </div>
    </div>
  );
}
