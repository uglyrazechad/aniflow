import { NextResponse } from 'next/server';

const SERVER =
  process.env.ROOMS_URL || `http://127.0.0.1:${process.env.ROOMS_PORT || 3000}`;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await fetch(`${SERVER}/api/rooms/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({ error: 'Комната не найдена' }));
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${SERVER}/api/rooms/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({ error: 'Комната не найдена' }));
  return NextResponse.json(data, { status: res.status });
}
