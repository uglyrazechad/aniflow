'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, Lock, Mail, User } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthFormProps {
  mode: 'login' | 'register';
  next?: string;
}

export function AuthForm({ mode, next }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const isRegister = mode === 'register';
  const redirectTo = next && next.startsWith('/') ? next : '/';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    try {
      const response = await fetch(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isRegister
            ? { email, password, displayName }
            : { login: email, password },
        ),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        needsVerification?: boolean;
      };
      if (!response.ok) {
        toast.error(data.error || 'Не получилось. Попробуйте ещё раз');
        return;
      }

      if (data.needsVerification) {
        toast.success('Проверьте почту — код отправлен');
        router.push('/verify-email');
        router.refresh();
        return;
      }

      toast.success(isRegister ? 'Аккаунт создан' : 'С возвращением!');
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error('Сеть недоступна. Проверьте соединение');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {isRegister ? (
        <label className="block space-y-1.5">
          <span className="text-xs text-muted-foreground">Как вас звать</span>
          <span className="relative block">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ник на сайте"
              maxLength={40}
              className="pl-9"
              autoComplete="nickname"
            />
          </span>
        </label>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-xs text-muted-foreground">
          {isRegister ? 'Почта' : 'Почта или ник'}
        </span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={isRegister ? 'you@example.com' : 'you@example.com'}
            type={isRegister ? 'email' : 'text'}
            required
            autoComplete={isRegister ? 'email' : 'username'}
            className="pl-9"
          />
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs text-muted-foreground">Пароль</span>
        <span className="relative block">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegister ? 'Минимум 6 символов' : '••••••'}
            type="password"
            required
            minLength={6}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            className="pl-9"
          />
        </span>
      </label>

      <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isRegister ? 'Создать аккаунт' : 'Войти'}
      </Button>

      {!isRegister ? (
        <Link
          href="/auth/reset-password"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Забыли пароль?
        </Link>
      ) : null}

      <div className="space-y-2">
        <Button asChild variant="outline" className="w-full">
          <Link href="/api/auth/yandex">
            <KeyRound className="h-4 w-4" />
            Войти через Яндекс
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/api/auth/vk">
            <KeyRound className="h-4 w-4" />
            Войти через ВКонтакте (VK)
          </Link>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {isRegister ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
        <Link
          href={`${isRegister ? '/login' : '/register'}${redirectTo !== '/' ? `?next=${encodeURIComponent(redirectTo)}` : ''}`}
          className="font-medium text-primary hover:underline"
        >
          {isRegister ? 'Войти' : 'Зарегистрироваться'}
        </Link>
      </p>
    </form>
  );
}
