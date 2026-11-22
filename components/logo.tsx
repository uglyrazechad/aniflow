import Link from 'next/link';

import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn('group flex shrink-0 items-center gap-3 outline-none', className)}
      aria-label="AniHub — на главную"
    >
      <img
        src="/site-avatar.jpg"
        alt=""
        width={512}
        height={512}
        loading="lazy"
        className="h-8 w-8 rounded-full object-cover"
      />
      <img
        src="/site-name.png"
        alt="AniHub"
        width={110}
        height={24}
        loading="lazy"
        className="h-6 w-auto object-contain"
      />
    </Link>
  );
}
