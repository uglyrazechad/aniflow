'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  accent?: string;
  className?: string;
  ring?: boolean;
}

/** Аватар с инициалами, если картинки нет или она не загрузилась. */
export function Avatar({ src, name, accent = '#7c5cff', className, ring }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-foreground',
        className,
      )}
      style={ring ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(140deg, ${accent}, hsl(var(--background)))`,
          }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
