'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, History, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PublicUser } from '@/types/user';

export function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;

    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { user?: PublicUser | null }) => {
        if (alive) setUser(data.user ?? null);
      })
      .catch(() => {
        if (alive) setUser(null);
      });

    return () => {
      alive = false;
    };
  }, [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    toast.success('Вы вышли из аккаунта');
    setUser(null);
    router.push('/');
    router.refresh();
  };

  if (user === undefined) {
    return <span className="h-10 w-10 animate-pulse rounded-full bg-secondary/70" />;
  }

  if (!user) {
    return (
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-10 rounded-xl border-border/60 bg-card/40 px-3"
      >
        <Link href="/login">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Войти</span>
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Профиль"
          className="rounded-full outline-none ring-offset-2 ring-offset-background transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Avatar
            src={user.profile.avatarUrl}
            name={user.profile.displayName}
            accent={user.profile.accent}
            className="h-10 w-10 border border-border/60"
            ring
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block truncate text-sm font-semibold">{user.profile.displayName}</span>
          <span className="block truncate text-[11px] font-normal text-muted-foreground">
            @{user.username}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Мой профиль
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/favorites" className="cursor-pointer">
            <Heart className="mr-2 h-4 w-4" />
            Избранное
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/history" className="cursor-pointer">
            <History className="mr-2 h-4 w-4" />
            История
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
