import { NextResponse } from 'next/server';

import { currentUser, hashPassword, toSafeUser, verifyPassword } from '@/lib/server/auth';
import { db, flush } from '@/lib/server/db';
import { PROFILE_ACCENTS, PROFILE_THEMES } from '@/lib/profile-themes';

interface ProfileBody {
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  background?: string;
  accent?: string;
  username?: string;
  currentPassword?: string;
  newPassword?: string;
}

const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,19}$/;
const RESERVED = new Set(['login', 'register', 'profile', 'api', 'u', 'admin', 'search', 'anime']);

function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('/api/uploads/')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ProfileBody | null;
  if (!body) {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  if (body.username !== undefined && body.username !== user.username) {
    const username = body.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: 'Ник: 3–20 символов, латиница, цифры, точка, дефис или подчёркивание' },
        { status: 400 },
      );
    }
    if (RESERVED.has(username)) {
      return NextResponse.json({ error: 'Этот ник занят системой' }, { status: 409 });
    }
    const taken = db().users.some(
      (item) => item.id !== user.id && item.username.toLowerCase() === username,
    );
    if (taken) {
      return NextResponse.json({ error: 'Этот ник уже занят' }, { status: 409 });
    }
    user.username = username;
  }

  if (body.displayName !== undefined) {
    const displayName = body.displayName.trim();
    if (!displayName || displayName.length > 40) {
      return NextResponse.json({ error: 'Имя: от 1 до 40 символов' }, { status: 400 });
    }
    user.profile.displayName = displayName;
  }

  if (body.bio !== undefined) {
    const bio = body.bio.trim();
    if (bio.length > 300) {
      return NextResponse.json({ error: 'Описание длиннее 300 символов' }, { status: 400 });
    }
    user.profile.bio = bio;
  }

  if (body.avatarUrl !== undefined) user.profile.avatarUrl = safeUrl(body.avatarUrl);
  if (body.bannerUrl !== undefined) user.profile.bannerUrl = safeUrl(body.bannerUrl);

  if (body.background !== undefined) {
    const background = body.background.trim();
    const preset = PROFILE_THEMES.some((theme) => theme.key === background);
    if (preset) {
      user.profile.background = background;
    } else {
      const url = safeUrl(background);
      if (!url) {
        return NextResponse.json({ error: 'Неизвестный фон профиля' }, { status: 400 });
      }
      user.profile.background = url;
    }
  }

  if (body.accent !== undefined) {
    const accent = body.accent.trim();
    if (!PROFILE_ACCENTS.includes(accent)) {
      return NextResponse.json({ error: 'Неизвестный цвет акцента' }, { status: 400 });
    }
    user.profile.accent = accent;
  }

  if (body.newPassword) {
    if (!body.currentPassword || !verifyPassword(body.currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: 'Текущий пароль неверный' }, { status: 403 });
    }
    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: 'Новый пароль короче 6 символов' }, { status: 400 });
    }
    user.passwordHash = hashPassword(body.newPassword);
  }

  flush();
  return NextResponse.json({ user: toSafeUser(user) });
}
