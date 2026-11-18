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

export function saveProgress(entry: WatchProgress): void {
  if (!entry.id) return;

  const store = readStore();
  store[entry.id] = entry;

  const trimmed = Object.values(store)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_ITEMS);

  writeStore(Object.fromEntries(trimmed.map((item) => [item.id, item])));
}

export function removeProgress(id: string): void {
  const store = readStore();
  delete store[id];
  writeStore(store);
}

export function progressPercent(entry: WatchProgress): number {
  if (!entry.duration || entry.duration <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((entry.position / entry.duration) * 100)));
}
