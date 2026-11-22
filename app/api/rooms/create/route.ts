import { NextResponse } from 'next/server';

const SERVER =
  process.env.ROOMS_URL || `http://127.0.0.1:${process.env.ROOMS_PORT || 3000}`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${SERVER}/api/rooms/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
