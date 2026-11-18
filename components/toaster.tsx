'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="bottom-right"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: 'rounded-2xl border border-border/60',
        },
      }}
    />
  );
}
