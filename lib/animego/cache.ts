/**
 * Маленький in-memory кэш с TTL и склейкой одинаковых параллельных запросов.
 * Живёт в памяти процесса Next.js и разгружает AnimeGO при частых переходах.
 */

type Entry = {
  value: unknown;
  expiresAt: number;
};

const MAX_ENTRIES = 300;
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

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
