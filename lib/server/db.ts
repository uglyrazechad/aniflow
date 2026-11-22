import fs from 'node:fs';
import path from 'node:path';

import type { FavoriteEntry, Profile } from '@/types/user';
import type { WatchProgress } from '@/lib/watch-progress';

export type { FavoriteEntry, Profile };

export type SocialProvider = 'yandex' | 'vk';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: number;
  profile: Profile;
  progress: Record<string, WatchProgress>;
  favorites: FavoriteEntry[];
  emailVerified: boolean;
  emailCode: string | null;
  emailCodeExpiresAt: number | null;
  resetCode: string | null;
  resetExpiresAt: number | null;
  provider: SocialProvider | null;
  providerId: string | null;
  /** Expo push-токены устройств (мобильное приложение). */
  pushTokens?: string[];
}

export interface SessionRecord {
  userId: string;
  createdAt: number;
  expiresAt: number;
}

interface Database {
  version: 1;
  users: UserRecord[];
  sessions: Record<string, SessionRecord>;
}

const DATA_DIR = process.env.ANIFLOW_DATA_DIR?.trim() || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

let database: Database | null = null;

function emptyDatabase(): Database {
  return { version: 1, users: [], sessions: {} };
}

function normalize(input: unknown): Database {
  if (!input || typeof input !== 'object') return emptyDatabase();

  const value = input as Partial<Database>;
  return {
    version: 1,
    users: Array.isArray(value.users)
      ? value.users.map((user) => ({
          ...user,
          emailVerified: user.emailVerified ?? true,
          emailCode: user.emailCode ?? null,
          emailCodeExpiresAt: user.emailCodeExpiresAt ?? null,
          resetCode: user.resetCode ?? null,
          resetExpiresAt: user.resetExpiresAt ?? 0,
          provider: user.provider ?? null,
          providerId: user.providerId ?? null,
          pushTokens: Array.isArray(user.pushTokens)
            ? user.pushTokens.filter((token): token is string => typeof token === 'string').slice(-5)
            : [],
        }))
      : [],
    sessions: value.sessions && typeof value.sessions === 'object' ? value.sessions : {},
  };
}

/** Единственный экземпляр базы: файл читается один раз при первом обращении. */
export function db(): Database {
  if (database) return database;

  try {
    database = normalize(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
  } catch {
    database = emptyDatabase();
  }

  // Просроченные сессии не нужны никому.
  const now = Date.now();
  for (const [token, session] of Object.entries(database.sessions)) {
    if (!session || session.expiresAt <= now) delete database.sessions[token];
  }

  return database;
}

/** Синхронная запись через временный файл, чтобы не порвать JSON при сбое. */
export function flush(): void {
  const state = database;
  if (!state) return;

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const temporary = `${DB_FILE}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(state), 'utf8');
    fs.renameSync(temporary, DB_FILE);
  } catch (error) {
    console.error('[db] не удалось сохранить базу', error);
  }
}

export function findUserById(id: string): UserRecord | undefined {
  return db().users.find((user) => user.id === id);
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const needle = email.trim().toLowerCase();
  return db().users.find((user) => user.email.toLowerCase() === needle);
}

export function findUserByUsername(username: string): UserRecord | undefined {
  const needle = username.trim().toLowerCase();
  return db().users.find((user) => user.username.toLowerCase() === needle);
}

export function findUserByProvider(provider: SocialProvider, providerId: string): UserRecord | undefined {
  return db().users.find((user) => user.provider === provider && user.providerId === providerId);
}

export function emailTaken(email: string): boolean {
  return Boolean(findUserByEmail(email));
}

export function usernameTaken(username: string): boolean {
  return Boolean(findUserByUsername(username));
}
