import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

import { currentUser } from '@/lib/server/auth';
import { UPLOAD_DIR } from '@/lib/server/db';

const MAX_BYTES = 5 * 1024 * 1024;

function detectExtension(bytes: Uint8Array): string | null {
  const startsWith = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);

  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'png';
  if (startsWith(0xff, 0xd8, 0xff)) return 'jpg';
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return 'gif';
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не получен' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Картинка больше 5 МБ' }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = detectExtension(bytes);
  if (!extension) {
    return NextResponse.json(
      { error: 'Поддерживаются PNG, JPEG, WEBP и GIF' },
      { status: 415 },
    );
  }

  const name = `${user.id.slice(0, 8)}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}.${extension}`;

  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, name), bytes);
  } catch (error) {
    console.error('[upload] не удалось сохранить файл', error);
    return NextResponse.json({ error: 'Не удалось сохранить файл' }, { status: 500 });
  }

  return NextResponse.json({ url: `/api/uploads/${name}` }, { status: 201 });
}
