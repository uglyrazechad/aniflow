import * as cheerio from 'cheerio';

import type { TranslationOption } from '@/types/anime';
import { cached } from './cache';
import {
  ANIMEGO_BASE,
  ANIMEGO_XHR_HEADERS,
  AnimeGoError,
  decodeHtmlEntities,
  describeAnimeGoError,
  fetchHtml,
  fetchJson,
} from './http';
import { parsePlayer, type ParsedPlayer, type ParsedVoice } from './parse';

/** CVH (CdnVideoHub) — API, которое AnimeGO использует для части озвучек. */
const CVH_API = 'https://plapi.cdnvideohub.com/api/v1/player/sv';
const CVH_PUB = '747';
const CVH_AGGR = 'mali';

const PLAYER_TTL_MS = 10 * 60 * 1000;
const CVH_PLAYLIST_TTL_MS = 10 * 60 * 1000;
const CVH_VIDEO_TTL_MS = 5 * 60 * 1000;
const ANIBOOM_TTL_MS = 10 * 60 * 1000;

/** Последняя часть slug-а — числовой id AnimeGO (`magicheskaya-bitva-1635` → `1635`). */
export function numericAnimeId(id: string): string {
  const match = id.match(/-(\d+)$/);
  return match ? match[1] : id.replace(/\D/g, '');
}

interface PlayerResponse {
  data?: { content?: string };
}

async function fetchPlayerContent(animeId: string, episode: number): Promise<string> {
  const load = async (url: string) => {
    const json = await fetchJson<PlayerResponse>(url, { headers: ANIMEGO_XHR_HEADERS });
    const content = json.data?.content;
    if (!content) throw new AnimeGoError('AnimeGO не вернул HTML плеера', 'parse');
    return content;
  };

  if (episode <= 1) {
    return load(`${ANIMEGO_BASE}/player/${animeId}`);
  }

  // Для остальных серий нужен id видео из списка серий на странице плеера.
  const first = await loadPlayer(animeId, 1);
  const target = first.episodes.find((item) => item.number === episode);
  if (!target) {
    throw new AnimeGoError(`Серия ${episode} не найдена на AnimeGO`, 'notfound');
  }

  return load(`${ANIMEGO_BASE}/player/videos/${target.videoId}`);
}

export function loadPlayer(animeId: string, episode = 1): Promise<ParsedPlayer> {
  return cached(`player:${animeId}:${episode}`, PLAYER_TTL_MS, async () => {
    const content = await fetchPlayerContent(animeId, episode);
    return parsePlayer(content);
  });
}

export function toTranslation(voice: ParsedVoice): TranslationOption {
  const player = voice.providers.find((item) => item.player === 'aniboom')?.player
    ?? voice.providers.find((item) => item.player === 'cvh')?.player
    ?? voice.providers[0]?.player;

  return {
    id: voice.id,
    title: voice.title,
    type: voice.type,
    player: player === 'other' ? undefined : player,
  };
}

export async function loadTranslations(animeId: string): Promise<TranslationOption[]> {
  const player = await loadPlayer(animeId, 1);

  // Оставляем только озвучки, у которых есть AniBoom или CVH: Kodik-плеер не используется.
  return player.voices
    .filter((voice) =>
      voice.providers.some(
        (provider) => provider.player === 'aniboom' || provider.player === 'cvh',
      ),
    )
    .map(toTranslation);
}

/** Прокси со своим origin: CDN AnimeGO/AniBoom не отдают CORS-заголовки. */
function proxyUrl(target: string, referer: string): string {
  const search = new URLSearchParams({ url: target, ref: referer });
  return `/api/stream?${search.toString()}`;
}

function withHttps(url: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http')) return url;
  return `${ANIMEGO_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

interface ResolvedMedia {
  src: string;
  type: 'hls' | 'mp4';
}

async function resolveAniBoom(embed: string): Promise<ResolvedMedia> {
  return cached(`aniboom:${embed}`, ANIBOOM_TTL_MS, async (): Promise<ResolvedMedia> => {
    const html = await fetchHtml(withHttps(embed), {
      headers: {
        Referer: `${ANIMEGO_BASE}/`,
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
    });

    const $ = cheerio.load(html);
    const raw = $('video#video').first().attr('data-parameters');
    if (!raw) throw new AnimeGoError('AniBoom не вернул параметры плеера', 'parse');

    let params: Record<string, string>;
    try {
      params = JSON.parse(decodeHtmlEntities(raw)) as Record<string, string>;
    } catch {
      throw new AnimeGoError('Не удалось разобрать параметры AniBoom', 'parse');
    }

    const hls = params.hls ? (JSON.parse(params.hls) as { src?: string }).src : undefined;
    if (!hls) {
      throw new AnimeGoError('AniBoom не отдал HLS-поток', 'parse');
    }

    await assertPlaylist(hls, 'https://aniboom.one/');

    return { src: proxyUrl(hls, 'https://aniboom.one/'), type: 'hls' };
  });
}

/**
 * AniBoom раздаёт видео с нескольких CDN-хостов, и часть из них периодически
 * не отвечает. Проверяем мастер-плейлист, чтобы при сбое переключиться на CVH.
 */
async function assertPlaylist(url: string, referer: string): Promise<void> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Referer: referer,
        Accept: '*/*',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });

    if (response.ok) {
      const head = await response.text();
      if (head.trimStart().startsWith('#EXTM3U')) return;
    }
  } catch {
    // Ниже отдаём ошибку — вызывающий код переключится на CVH.
  }

  throw new AnimeGoError('AniBoom CDN не отдал плейлист', 'network');
}

interface CvhPlaylistItem {
  season: number;
  episode: number;
  vkId: string;
  voiceStudio?: string | null;
}

interface CvhPlaylistResponse {
  items?: CvhPlaylistItem[];
}

interface CvhVideoResponse {
  sources?: Record<string, unknown>;
}

function matchStudio(label: string, studios: string[]): string | undefined {
  const needle = label.toLowerCase();
  const exact = studios.find((studio) => studio.toLowerCase() === needle);
  if (exact) return exact;
  return studios.find((studio) => {
    const value = studio.toLowerCase();
    return value.includes(needle) || needle.includes(value);
  });
}

async function resolveCvh(
  embed: string,
  episode: number,
  title: string,
): Promise<ResolvedMedia> {
  const cvhId = embed.match(/cdn-iframe\/(\d+)/)?.[1];
  if (!cvhId) throw new AnimeGoError('Не удалось определить cvh_id', 'parse');

  const headers = {
    Referer: `${ANIMEGO_BASE}/`,
    Accept: 'application/json',
  };

  const playlist = await cached(`cvh:${cvhId}`, CVH_PLAYLIST_TTL_MS, () =>
    fetchJson<CvhPlaylistResponse>(
      `${CVH_API}/playlist?pub=${CVH_PUB}&aggr=${CVH_AGGR}&id=${cvhId}`,
      { headers },
    ),
  );

  const items = playlist.items ?? [];
  if (!items.length) throw new AnimeGoError('CVH вернул пустой плейлист', 'notfound');

  const seasonsWithEpisode = [
    ...new Set(items.filter((item) => item.episode === episode).map((item) => item.season)),
  ];
  const season = seasonsWithEpisode.includes(1) ? 1 : (seasonsWithEpisode[0] ?? 1);

  const episodeItems = items.filter((item) => item.season === season && item.episode === episode);
  if (!episodeItems.length) throw new AnimeGoError('CVH не нашёл выбранную серию', 'notfound');

  const studios = [
    ...new Set(episodeItems.map((item) => item.voiceStudio).filter(Boolean) as string[]),
  ];
  const studio = matchStudio(title, studios);
  if (!studio) throw new AnimeGoError('CVH не нашёл подходящую озвучку', 'notfound');

  const target = episodeItems.find((item) => item.voiceStudio === studio);
  if (!target) throw new AnimeGoError('CVH не вернул видео для озвучки', 'notfound');

  const video = await cached(`cvh:video:${target.vkId}`, CVH_VIDEO_TTL_MS, () =>
    fetchJson<CvhVideoResponse>(`${CVH_API}/video/${target.vkId}`, { headers }),
  );

  const sources = video.sources ?? {};
  const hls = typeof sources.hlsUrl === 'string' ? sources.hlsUrl : undefined;
  if (hls) return { src: proxyUrl(hls, `${ANIMEGO_BASE}/`), type: 'hls' };

  const mp4 = [
    'mpeg4kUrl',
    'mpeg2kUrl',
    'mpegQhdUrl',
    'mpegFullHdUrl',
    'mpegHighUrl',
    'mpegMediumUrl',
    'mpegLowUrl',
  ]
    .map((key) => sources[key])
    .find((value): value is string => typeof value === 'string' && value.startsWith('http'));

  if (mp4) return { src: proxyUrl(mp4, `${ANIMEGO_BASE}/`), type: 'mp4' };

  throw new AnimeGoError('CVH не отдал ни HLS, ни MP4', 'notfound');
}

export interface ResolvedStream {
  src: string;
  type: 'hls' | 'mp4';
  translation: TranslationOption;
}

/**
 * Находит поток для выбранной озвучки и серии.
 * Приоритет — AniBoom (отдаёт HLS), затем CVH. Kodik-кнопки AnimeGO игнорируются.
 */
export async function resolveStream(params: {
  animeId: string;
  episode: number;
  translationId?: number;
}): Promise<ResolvedStream> {
  const { animeId, episode, translationId } = params;
  const player = await loadPlayer(animeId, episode);

  const usable = player.voices.filter((item) =>
    item.providers.some((provider) => provider.player === 'aniboom' || provider.player === 'cvh'),
  );

  if (!usable.length) {
    throw new AnimeGoError(
      'У этого тайтла на AnimeGO нет озвучек с плеером AniBoom или CVH. Обычно так бывает у фильмов — там доступен только Kodik, который не поддерживается.',
      'notfound',
    );
  }

  // Сначала пробуем выбранную озвучку, затем остальные: если её CDN лежит,
  // лучше отдать другую озвучку, чем ошибку. Больше трёх не перебираем,
  // чтобы запрос не висел минутами.
  const candidates = [
    ...(translationId ? usable.filter((item) => item.id === translationId) : []),
    ...usable.filter((item) => item.id !== translationId),
  ].slice(0, 3);

  let lastError: unknown = null;

  for (const voice of candidates) {
    const ordered = [...voice.providers].sort((a, b) => {
      const rank = (value: typeof a.player) =>
        value === 'aniboom' ? 0 : value === 'cvh' ? 1 : value === 'kodik' ? 3 : 2;
      return rank(a.player) - rank(b.player);
    });

    for (const provider of ordered) {
      try {
        if (provider.player === 'aniboom') {
          const media = await resolveAniBoom(provider.embed);
          return { ...media, translation: toTranslation(voice) };
        }
        if (provider.player === 'cvh') {
          const media = await resolveCvh(provider.embed, episode, voice.title);
          return { ...media, translation: toTranslation(voice) };
        }
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw new AnimeGoError(
    `Не удалось получить поток: ${describeAnimeGoError(lastError)}. Попробуйте другую озвучку или серию.`,
  );
}
