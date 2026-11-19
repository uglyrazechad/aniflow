'use client';

export interface WatchProgress {
  id: string;
  title: string;
  posterUrl?: string;
  season: number;
  episode: number;
  translationId: number;
  translationTitle?: string;
  /** Секунда, на которой пользователь остановился. */
  position: number;
  /** Полная длительность серии в секундах (0, если ещё неизвестна). */
  duration: number;
  updatedAt: number;
}

const STORAGE_KEY = 'aniflow:progress:v1';
const MAX_ITEMS = 30;
/** Меньше этого значения не считаем просмотром. */
const MIN_POSITION = 5;

type Store = Record<string, WatchProgress>;

function readStore(): Store {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* переполненное или закрытое хранилище — просто не сохраняем */
  }
}

function trim(store: Store): Store {
  return Object.fromEntries(
    Object.values(store)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ITEMS)
      .map((item) => [item.id, item]),
  );
}

export function getProgress(id: string): WatchProgress | null {
  const entry = readStore()[id];
  return entry && typeof entry.position === 'number' ? entry : null;
}

export function listProgress(): WatchProgress[] {
  return Object.values(readStore())
    .filter((entry) => entry && entry.position >= MIN_POSITION)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ITEMS);
}

/** Кэш на 15 секунд: не спрашиваем сервер о сессии на каждое сохранение. */
let authCache: { value: boolean; at: number } | null = null;

async function isLoggedIn(): Promise<boolean> {
  if (authCache && Date.now() - authCache.at < 15_000) return authCache.value;

  try {
    const response = await fetch('/api/auth/me', { cache: 'no-store' });
    const data = (await response.json()) as { user?: unknown };
    authCache = { value: Boolean(data.user), at: Date.now() };
    return authCache.value;
  } catch {
    return false;
  }
}

function pushEntry(entry: WatchProgress): void {
  void isLoggedIn().then((authorized) => {
    if (!authorized) return;

    void fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry }),
      keepalive: true,
    }).catch(() => null);
  });
}

export function saveProgress(entry: WatchProgress): void {
  if (!entry.id) return;

  const store = readStore();
  store[entry.id] = entry;
  writeStore(trim(store));

  pushEntry(entry);
}

export function removeProgress(id: string): void {
  const store = readStore();
  delete store[id];
  writeStore(store);

  void isLoggedIn().then((authorized) => {
    if (!authorized) return;
    void fetch(`/api/progress?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(
      () => null,
    );
  });
}

/**
 * Сливает локальную историю с серверной: побеждает более свежая запись.
 * Вызывается при открытии страниц с «Продолжить просмотр».
 */
export async function syncAccountProgress(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const response = await fetch('/api/progress', { cache: 'no-store' });
    if (!response.ok) return;

    const data = (await response.json()) as { items?: WatchProgress[]; authorized?: boolean };
    const remote = data.items ?? [];

    const merged: Store = { ...readStore() };
    for (const item of remote) {
      const local = merged[item.id];
      if (!local || local.updatedAt < item.updatedAt) merged[item.id] = item;
    }

    writeStore(trim(merged));

    if (!data.authorized) return;

    const remoteById = new Map(remote.map((item) => [item.id, item]));
    for (const [id, item] of Object.entries(merged)) {
      const serverEntry = remoteById.get(id);
      if (!serverEntry || serverEntry.updatedAt < item.updatedAt) pushEntry(item);
    }
  } catch {
    /* офлайн — работаем на локальной истории */
  }
}

export function progressPercent(entry: WatchProgress): number {
  if (!entry.duration || entry.duration <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((entry.position / entry.duration) * 100)));
}
