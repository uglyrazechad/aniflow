/**
 * Маленький in-memory кэш с TTL и склейкой одинаковых параллельных запросов.
 * Живёт в памяти процесса Next.js и разгружает AnimeGO при частых переходах.
 * Персистируется на диск — после перезапуска не приходится заново «прогревать» AnimeGO.
 */

import fs from 'node:fs';
import path from 'node:path';

type Entry = {
  value: unknown;
  expiresAt: number;
};

const MAX_ENTRIES = 300;
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

const STORE_FILE = path.join(process.cwd(), 'data', 'animego-cache.json');
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function loadFromDisk(): void {
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    for (const [key, entry] of JSON.parse(raw) as Array<[string, Entry]>) {
      if (entry && entry.expiresAt > Date.now() && store.size < MAX_ENTRIES) store.set(key, entry);
    }
  } catch {
    /* файла ещё нет или нечитаемый — начинаем с пустого кэша */
  }
}

function saveToDisk(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
      fs.writeFileSync(STORE_FILE, JSON.stringify([...store.entries()]));
    } catch {
      /* диск текущего процесса недоступен — следующая запись повторит */
    }
  }, 200);
}

loadFromDisk();

export function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);

  if (hit && hit.expiresAt > now) {
    return Promise.resolve(hit.value as T);
  }

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const promise = loader()
    .then((value) => {
      if (store.size >= MAX_ENTRIES) {
        const oldest = store.keys().next().value;
        if (oldest) store.delete(oldest);
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      saveToDisk();
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
