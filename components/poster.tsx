'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

interface PosterProps {
  src?: string;
  alt: string;
  title: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}

/** Обложка с изящным fallback-градиентом, если постера нет или он не загрузился. */
export function Poster({ src, alt, title, className, imgClassName, eager }: PosterProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  const hue = Array.from(title).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360;
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {showFallback ? (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(150deg, hsl(${hue} 70% 32%), hsl(${
              (hue + 60) % 360
            } 65% 18%) 60%, hsl(${(hue + 120) % 360} 60% 12%))`,
          }}
          aria-hidden={!!src}
        >
          <span className="select-none text-3xl font-black tracking-tight text-white/25">
            {initials || 'AN'}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      )}
    </div>
  );
}
