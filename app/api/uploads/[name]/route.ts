import fs from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import { UPLOAD_DIR } from '@/lib/server/db';

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  if (!/^[a-z0-9-]+\.(png|jpe?g|webp|gif)$/i.test(name)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const file = await fs.readFile(path.join(UPLOAD_DIR, name));
    const extension = name.split('.').pop()?.toLowerCase() ?? '';

    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
