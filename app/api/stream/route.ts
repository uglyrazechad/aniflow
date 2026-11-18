import { NextResponse } from 'next/server';

/**
 * Прокси для видео-CDN AnimeGO (AniBoom, CVH, Kodik-плееры не используются).
 * Эти CDN не отдают CORS-заголовки для сторонних origin, а HLS-плейлисты
 * ссылаются на относительные сегменты. Роут загружает плейлист, переписывает
 * URI на самого себя и отдаёт сегменты/ключи через тот же origin.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT_MS = 20_000;

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0') return true;

  // IPv6-проверки только для адресов, а не для доменов, начинающихся с fc/fd/fe80.
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true;
    if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }

  return false;
}

function parseTarget(raw: string | null): URL | null {
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (isPrivateHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function parseReferer(raw: string | null): string {
  if (!raw) return 'https://animego.me/';

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'https://animego.me/';
    return url.toString();
  } catch {
    return 'https://animego.me/';
  }
}

function proxify(uri: string, base: URL, referer: string): string {
  let absolute: URL;

  try {
    absolute = new URL(uri, base);
  } catch {
    return uri;
  }

  if (absolute.protocol !== 'https:' && absolute.protocol !== 'http:') return uri;

  // Смешанный контент на https-странице браузер заблокирует — поднимаем до https.
  if (absolute.protocol === 'http:' && base.protocol === 'https:') absolute.protocol = 'https:';

  return `/api/stream?${new URLSearchParams({ url: absolute.toString(), ref: referer })}`;
}

function rewritePlaylist(content: string, base: URL, referer: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#')) {
        return line.replace(
          /URI="([^"]*)"/g,
          (_match, uri: string) => `URI="${proxify(uri, base, referer)}"`,
        );
      }

      return proxify(trimmed, base, referer);
    })
    .join('\n');
}

function isPlaylist(url: URL, contentType: string | null): boolean {
  if (contentType && /mpegurl/i.test(contentType)) return true;
  return /\.m3u8?$/i.test(url.pathname);
}

async function fetchUpstream(
  target: URL,
  headers: Record<string, string>,
  attempts = 2,
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(target, {
        headers,
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = parseTarget(searchParams.get('url'));

  if (!target) {
    return NextResponse.json({ error: 'Некорректный адрес потока' }, { status: 400 });
  }

  const referer = parseReferer(searchParams.get('ref'));
  const range = request.headers.get('range');

  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: '*/*',
    Referer: referer,
    'Accept-Language': 'ru-RU,ru;q=0.9',
  };
  if (range) headers.Range = range;

  let upstream: Response;

  try {
    upstream = await fetchUpstream(target, headers);
  } catch (error) {
    console.error('[api/stream]', target.hostname, error);
    return NextResponse.json({ error: 'Видео-CDN недоступен' }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Видео-CDn вернул ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const contentType = upstream.headers.get('content-type');

  if (isPlaylist(target, contentType)) {
    const playlist = rewritePlaylist(await upstream.text(), target, referer);
    return new NextResponse(playlist, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'private, max-age=5',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const responseHeaders = new Headers({
    'Content-Type': contentType ?? 'application/octet-stream',
    'Cache-Control': upstream.headers.get('cache-control') ?? 'private, max-age=600',
    'Access-Control-Allow-Origin': '*',
  });

  for (const name of ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const value = upstream.headers.get(name);
    if (value && !upstream.headers.get('content-encoding')) responseHeaders.set(name, value);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function HEAD(request: Request) {
  const response = await GET(request);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
