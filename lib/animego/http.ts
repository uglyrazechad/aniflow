import 'server-only';

/**
 * HTTP-слой для AnimeGO: единый User-Agent, таймауты и понятные ошибки.
 * Библиотека-оригинал (anime-parsers-ru) ходит на animego.org, но сайт
 * редиректит на animego.me, поэтому базовый домен настраивается через env.
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT_MS = 15_000;

function resolveBase(): string {
  const mirror = process.env.ANIMEGO_MIRROR?.trim();
  if (!mirror) return 'https://animego.me';
  return mirror.startsWith('http') ? mirror.replace(/\/+$/, '') : `https://${mirror.replace(/\/+$/, '')}`;
}

export const ANIMEGO_BASE = resolveBase();

export type AnimeGoErrorKind = 'network' | 'notfound' | 'blocked' | 'parse';

export class AnimeGoError extends Error {
  readonly kind: AnimeGoErrorKind;

  constructor(message: string, kind: AnimeGoErrorKind = 'network') {
    super(message);
    this.name = 'AnimeGoError';
    this.kind = kind;
  }
}

export const ANIMEGO_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Accept-Language': 'ru-RU,ru;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

/** Заголовки для XHR-эндпоинтов плеера (`/player/...`). */
export const ANIMEGO_XHR_HEADERS: Record<string, string> = {
  ...ANIMEGO_HEADERS,
  'X-Requested-With': 'XMLHttpRequest',
  Accept: 'application/json, text/html;q=0.9,*/*;q=0.8',
  Referer: `${ANIMEGO_BASE}/`,
};

async function request(url: string, init?: RequestInit): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: { ...ANIMEGO_HEADERS, ...(init?.headers ?? {}) },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AnimeGoError(`AnimeGO не ответил: ${message}`, 'network');
  }

  if (response.status === 404) {
    throw new AnimeGoError('Страница AnimeGO не найдена', 'notfound');
  }

  if (response.status === 403 || response.status === 503) {
    throw new AnimeGoError(
      `AnimeGO отклонил запрос (${response.status}). Возможна блокировка Cloudflare/DDoS-Guard.`,
      'blocked',
    );
  }

  if (!response.ok) {
    throw new AnimeGoError(`AnimeGO вернул статус ${response.status}`, 'network');
  }

  return response;
}

export async function fetchHtml(url: string, init?: RequestInit): Promise<string> {
  const response = await request(url, init);
  const html = await response.text();

  if (/cf-browser-verification|checking your browser|ddos-guard/i.test(html)) {
    throw new AnimeGoError('AnimeGO показывает страницу проверки браузера', 'blocked');
  }

  return html;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await request(url, init);
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AnimeGoError('AnimeGO вернул не JSON', 'parse');
  }
}

/** Раскодирует HTML-сущности в JSON-атрибутах (`&quot;`, `&amp;` и т.п.). */
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export function describeAnimeGoError(error: unknown): string {
  if (error instanceof AnimeGoError) return error.message;
  return error instanceof Error ? error.message : String(error);
}
