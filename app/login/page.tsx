import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth/auth-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { currentUser } from '@/lib/server/auth';

export const metadata: Metadata = { title: 'Вход' };
export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await currentUser()) redirect('/profile');

  const { next } = await searchParams;

  return (
    <AuthShell title="Вход" subtitle="Продолжите с того места, где остановились">
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
