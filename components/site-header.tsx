'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, Smartphone } from 'lucide-react';

import { Logo } from '@/components/logo';
import { SearchBox } from '@/components/search-box';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Главная' },
  { href: '/#new', label: 'Новинки' },
  { href: '/#ongoing', label: 'Онгоинги' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300',
        scrolled
          ? 'border-b border-border/60 bg-background/75 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="container flex h-16 items-center gap-2 md:gap-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = link.href === '/' && pathname === '/';
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchBox className="hidden w-64 lg:block xl:w-80" />
          <UserMenu />
          <ThemeToggle />

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden rounded-xl border border-border/60 bg-card/40 sm:inline-flex"
          >
            <Link href="/download" aria-label="Скачать приложение">
              <Smartphone className="h-[18px] w-[18px]" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-xl border border-border/60 bg-card/40 lg:hidden"
          >
            <Link href="/search" aria-label="Поиск">
              <Search className="h-[18px] w-[18px]" />
            </Link>
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-border/60 bg-card/40 md:hidden"
                aria-label="Открыть меню"
              >
                <Menu className="h-[18px] w-[18px]" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
                <SheetDescription className="sr-only">Навигация по сайту</SheetDescription>
              </SheetHeader>

              <div className="mt-6">
                <SearchBox />
              </div>

              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/download"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  Приложение
                </Link>
              </nav>

              <p className="mt-auto rounded-xl border border-border/60 bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
                AniHub — красивый интерфейс к каталогу AnimeGO. Видео предоставляется сервисом
                AnimeGO, сайт его не хранит.
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
