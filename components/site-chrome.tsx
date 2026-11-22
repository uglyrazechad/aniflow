'use client';

import { usePathname } from 'next/navigation';

import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

/** Комнаты «Смотреть вместе» занимают весь экран — без общего хедера и футера. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname?.startsWith('/room/') ?? false;

  return (
    <>
      {bare ? null : <SiteHeader />}
      <main className="flex-1">{children}</main>
      {bare ? null : <SiteFooter />}
    </>
  );
}
