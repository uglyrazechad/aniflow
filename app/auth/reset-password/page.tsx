'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'password'>(searchParams.get('code') ? 'password' : 'email');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);

  const requestReset = async () => {
    setPending(true);
    try {
      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || 'Не получилось. Попробуйте ещё раз');
        return;
      }
      toast.success('Код сброса отправлен на почту');
      setStep('password');
    } catch {
      toast.error('Сеть недоступна. Проверьте соединение');
    } finally {
      setPending(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    setPending(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, newPassword }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || 'Не получилось. Попробуйте ещё раз');
        return;
      }
      toast.success('Пароль изменён');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Сеть недоступна. Проверьте соединение');
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title={step === 'email' ? 'Сброс пароля' : 'Новый пароль'}
      subtitle={step === 'email' ? 'Мы отправим код на вашу почту' : 'Введите код и новый пароль'}
    >
      {step === 'email' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void requestReset();
          }}
          className="space-y-4"
        >
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            required
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Отправка...' : 'Отправить код'}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void resetPassword();
          }}
          className="space-y-4"
        >
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Код из письма"
            inputMode="numeric"
            maxLength={6}
            required
          />
          <Input
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Новый пароль"
            type="password"
            minLength={6}
            required
          />
          <Input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Повторите пароль"
            type="password"
            minLength={6}
            required
          />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Вспомнили пароль? Вернуться на вход
        </Link>
      </p>
    </AuthShell>
  );
}
