'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async () => {
    setPending(true);
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || 'Не получилось. Попробуйте ещё раз');
        return;
      }
      toast.success('Почта подтверждена — входим...');
      router.push('/');
      router.refresh();
    } catch {
      toast.error('Сеть недоступна. Проверьте соединение');
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const response = await fetch('/api/auth/resend-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || 'Не удалось отправить код');
        return;
      }
      toast.success('Код отправлен повторно');
    } catch {
      toast.error('Сеть недоступна');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell title="Подтвердите почту" subtitle="Введите 6-значный код из письма на вашу почту">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
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
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Код из письма"
          inputMode="numeric"
          maxLength={6}
          required
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Проверка...' : 'Подтвердить'}
        </Button>
      </form>
      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full"
        disabled={resending || !email}
        onClick={() => void resend()}
      >
        {resending ? 'Отправка...' : 'Отправить код повторно'}
      </Button>
    </AuthShell>
  );
}
