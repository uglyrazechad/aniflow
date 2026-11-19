import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/auth-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { currentUser } from '@/lib/server/auth';

export const metadata: Metadata = { title: 'Регистрация' };
export const dynamic = 'force-dynamic';

interface RegisterPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  if (await currentUser()) redirect('/profile');

  const { next } = await searchParams;

  return (
    <AuthShell
      title="Создать аккаунт"
      subtitle="Почта и пароль — всё, что нужно. Подтверждение почты не требуется"
    >
      <AuthForm mode="register" next={next} />
    </AuthShell>
  );
}
