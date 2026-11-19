import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';

import {
  db,
  findUserById,
  findUserByUsername,
  flush,
  type Profile,
  type SessionRecord,
  type UserRecord,
} from './db';

export const SESSION_COOKIE = 'aniflow_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  createdAt: number;
  profile: Profile;
}

export function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt,
    profile: user.profile,
  };
}

export function defaultProfile(displayName: string): Profile {
  return {
    displayName,
    bio: '',
    avatarUrl: null,
    bannerUrl: null,
    background: 'aurora',
    accent: '#7c5cff',
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function newUserId(): string {
  return randomBytes(12).toString('hex');
}

/** Латиница из почты + суффикс при занятости. */
export function makeUsername(email: string, taken: (value: string) => boolean): string {
  const base =
    email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 20) || 'viewer';

  if (!taken(base)) return base;

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}${index}`;
    if (!taken(candidate)) return candidate;
  }

  return `${base}${Date.now().toString(36)}`;
}

export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;

  const session: SessionRecord = { userId, createdAt: Date.now(), expiresAt };
  db().sessions[token] = session;
  flush();

  return { token, expiresAt };
}

export function removeSession(token: string): void {
  const sessions = db().sessions;
  if (sessions[token]) {
    delete sessions[token];
    flush();
  }
}

function userByToken(token?: string): UserRecord | null {
  if (!token) return null;

  const session = db().sessions[token];
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    removeSession(token);
    return null;
  }

  return findUserById(session.userId) ?? null;
}

/** Текущий пользователь из cookie (для серверных компонентов и route-хендлеров). */
export async function currentUser(): Promise<UserRecord | null> {
  const store = await cookies();
  return userByToken(store.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(token: string, expiresAt: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) removeSession(token);
  store.delete(SESSION_COOKIE);
}

export function findUser(username: string): UserRecord | undefined {
  return findUserByUsername(username);
}
