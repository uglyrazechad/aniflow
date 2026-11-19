import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ProfileEditor } from '@/components/profile/profile-editor';
import { currentUser, toSafeUser } from '@/lib/server/auth';

export const metadata: Metadata = { title: 'Мой профиль' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/profile');

  return (
    <div className="container max-w-6xl space-y-6 py-6 lg:py-8">
      <ProfileEditor user={toSafeUser(user)} />
    </div>
  );
}
