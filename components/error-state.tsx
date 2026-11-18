import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Что-то пошло не так',
  description = 'Не удалось получить данные. Попробуйте обновить страницу чуть позже.',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function RetryLink({ children = 'Обновить' }: { children?: React.ReactNode }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href="">
        <RefreshCw className="h-3.5 w-3.5" />
        {children}
      </a>
    </Button>
  );
}
