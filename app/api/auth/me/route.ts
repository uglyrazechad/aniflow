import { NextResponse } from 'next/server';

import { currentUser, toSafeUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ user: user ? toSafeUser(user) : null });
}
