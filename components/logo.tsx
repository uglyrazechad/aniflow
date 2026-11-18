import Link from 'next/link';
import { Play } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn('group flex items-center gap-2.5 outline-none', className)}
      aria-label="AniFlow — на главную"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-primary to-teal-400 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.9)] transition-transform duration-300 group-hover:scale-105">
        <Play className="h-4 w-4 translate-x-px fill-white text-white" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Ani<span className="text-gradient">Flow</span>
      </span>
    </Link>
  );
}
