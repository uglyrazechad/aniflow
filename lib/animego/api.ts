import * as cheerio from 'cheerio';

import type {
  AnimeDetails,
  AnimeSummary,
  CatalogSection,
  DataSource,
  HomeData,
  PlayerPayload,
  SearchResult,
  TranslationOption,
} from '@/types/anime';
import { getDemoAnime, getDemoHome, searchDemo } from '@/lib/demo-data';
import { isDemoId } from '@/lib/utils';
import { cached } from './cache';
import { ANIMEGO_BASE, AnimeGoError, describeAnimeGoError, fetchHtml } from './http';
import { parseAnimeInfo, parseCards } from './parse';
import {
  loadPlayer,
  loadTranslations,
  numericAnimeId,
  resolveStream,
} from './player';

const SEARCH_TTL_MS = 5 * 60 * 1000;
const LIST_TTL_MS = 15 * 60 * 1000;
const DETAILS_TTL_MS = 30 * 60 * 1000;
const PLAYER_TTL_MS = 3 * 60 * 1000;

export const TOP_PAGE_SIZE = 25;
export const TOP_TOTAL = 250;
export const TOP_PAGES = Math.ceil(TOP_TOTAL / TOP_PAGE_SIZE);

export interface TopPage {
  items: AnimeSummary[];
  page: number;
  pages: number;
  total: number;
}

export { AnimeGoError };

async function loadCards(url: string, limit = 12): Promise<AnimeSummary[]> {
  const html = await fetchHtml(url);
  const cards = parseCards(cheerio.load(html), limit);
  return cards.map(({ animeId: _animeId, ...summary }) => summary);
}

export async function searchAnime(query: string, limit = 24): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return { items: [], total: 0, source: 'animego' };

  try {
    const url = `${ANIMEGO_BASE}/search/anime?q=${encodeURIComponent(trimmed)}`;
    const items = await cached(`search:${trimmed.toLowerCase()}:${limit}`, SEARCH_TTL_MS, () =>
      loadCards(url, limit),
    );
    return { items, total: items.length, source: 'animego' };
  } catch (error) {
    console.warn('[animego] поиск недоступен, демо-режим:', describeAnimeGoError(error));
    const items = searchDemo(trimmed, limit);
    return { items, total: items.length, source: 'demo' };
  }
}

async function fetchHome(): Promise<HomeData> {
  const year = new Date().getFullYear();

  const definitions = [
    {
      key: 'popular',
      title: 'Популярное',
      subtitle: 'Топ-250 AniHub',
      path: '/anime/top-250',
      href: '/top',
    },
    {
      key: 'new',
      title: 'Новинки сезона',
      subtitle: 'Свежие тайтлы текущего сезона',
      path: `/anime/season/${year}`,
      href: '/search',
    },
    {
      key: 'ongoing',
      title: 'Онгоинги',
      subtitle: 'Сейчас выходят новые серии',
      path: '/anime/status/ongoing',
      href: '/search',
    },
  ];

  const results = await Promise.allSettled(
    definitions.map((definition) => loadCards(`${ANIMEGO_BASE}${definition.path}`, 10)),
  );

  const sections: CatalogSection[] = [];

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled' || result.value.length === 0) return;
    const definition = definitions[index];
    sections.push({
      key: definition.key,
      title: definition.title,
      subtitle: definition.subtitle,
      href: definition.href,
      items: result.value,
    });
  });

  if (!sections.length) {
    const reason = results.find((result) => result.status === 'rejected');
    console.warn(
      '[animego] каталог недоступен, демо-режим:',
      reason && reason.status === 'rejected' ? describeAnimeGoError(reason.reason) : 'нет данных',
    );
    return getDemoHome();
  }

  const featuredCard = sections.find((section) => section.key === 'popular')?.items[0]
    ?? sections[0].items[0];

  const featured = (await getAnimeDetails(featuredCard.id).catch(() => null)) ?? featuredCard;

  return { featured, sections, source: 'animego' };
}

export function loadHome(): Promise<HomeData> {
  return cached('home', LIST_TTL_MS, fetchHome);
}

/**
 * Топ-250 AniHub: рейтинг берётся из раздела `/anime/top-250` на AnimeGO.
 * На странице 25 тайтлов, всего 10 страниц; кэш обновляется каждые 15 минут.
 */
export function loadTop(page: number): Promise<TopPage> {
  const safePage = Math.min(Math.max(Math.trunc(page) || 1, 1), TOP_PAGES);

  return cached(`top:${safePage}`, LIST_TTL_MS, async () => {
    const url =
      safePage === 1
        ? `${ANIMEGO_BASE}/anime/top-250`
        : `${ANIMEGO_BASE}/anime/top-250/${safePage}`;
    const html = await fetchHtml(url);
    const cards = parseCards(cheerio.load(html), TOP_PAGE_SIZE + 5);
    const items = cards
      .slice(0, TOP_PAGE_SIZE)
      .map(({ animeId: _animeId, ...summary }) => summary);

    return { items, page: safePage, pages: TOP_PAGES, total: TOP_TOTAL } satisfies TopPage;
  });
}

export interface CatalogPage {
  items: AnimeSummary[];
  page: number;
  hasMore: boolean;
  source: DataSource;
}

/** Слаги проверены на AnimeGO (все отдают 200). */
export const CATALOG_GENRES = [
  { slug: 'action', title: 'Экшен' },
  { slug: 'adventure', title: 'Приключения' },
  { slug: 'comedy', title: 'Комедия' },
  { slug: 'drama', title: 'Драма' },
  { slug: 'fantasy', title: 'Фэнтези' },
  { slug: 'romance', title: 'Романтика' },
  { slug: 'sci-fi', title: 'Фантастика' },
  { slug: 'mystery', title: 'Детектив' },
  { slug: 'shounen', title: 'Сёнэн' },
  { slug: 'seinen', title: 'Сэйнэн' },
  { slug: 'school', title: 'Школа' },
  { slug: 'isekai', title: 'Исекай' },
  { slug: 'mecha', title: 'Меха' },
  { slug: 'supernatural', title: 'Сверхъестественное' },
  { slug: 'horror', title: 'Ужасы' },
  { slug: 'psychological', title: 'Психологическое' },
  { slug: 'military', title: 'Военное' },
  { slug: 'historical', title: 'Историческое' },
  { slug: 'music', title: 'Музыка' },
  { slug: 'sports', title: 'Спорт' },
  { slug: 'slice-of-life', title: 'Повседневность' },
  { slug: 'detective', title: 'Расследование' },
] as const;

export const CATALOG_STATUSES = [
  { slug: 'ongoing', title: 'Онгоинги' },
  { slug: 'released', title: 'Вышедшие' },
] as const;

const SLUG_RE = /^[a-z0-9-]{2,40}$/;

/**
 * Страница каталога: жанр, сезон года или статус.
 * AnimeGO игнорирует `?year[]=` при постраничном выводе, поэтому год отдаёт `/anime/season/<year>`.
 */
export function loadCatalog(filter: {
  genre?: string;
  year?: number;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<CatalogPage> {
  const page = Math.min(Math.max(Math.trunc(filter.page ?? 1) || 1, 1), 50);
  const limit = Math.min(Math.max(Math.trunc(filter.limit ?? 24) || 24, 1), 48);
  const genre = filter.genre && SLUG_RE.test(filter.genre) ? filter.genre : undefined;
  const status = filter.status && SLUG_RE.test(filter.status) ? filter.status : undefined;
  const year = filter.year && filter.year >= 1990 && filter.year <= 2100 ? Math.trunc(filter.year) : undefined;

  let path = '/anime';
  if (genre) path = `/anime/genre/${genre}${page > 1 ? `/${page}` : ''}`;
  else if (status) path = `/anime/status/${status}${page > 1 ? `/${page}` : ''}`;
  else if (year) path = `/anime/season/${year}${page > 1 ? `/${page}` : ''}`;
  else if (page > 1) path = `/anime/${page}`;

  return cached(`catalog:${path}:${limit}`, LIST_TTL_MS, async () => {
    const items = await loadCards(`${ANIMEGO_BASE}${path}`, limit + 1);
    return {
      items: items.slice(0, limit),
      page,
      hasMore: items.length > limit,
      source: 'animego',
    } satisfies CatalogPage;
  });
}

function buildSeasons(episodesTotal: number): AnimeDetails['seasons'] {
  if (episodesTotal <= 1) return [];
  const total = Math.min(episodesTotal, 2000);

  return [
    {
      season: 1,
      title: 'Сезон 1',
      episodes: Array.from({ length: total }, (_, index) => ({ episode: index + 1 })),
    },
  ];
}

export function getAnimeDetails(id: string): Promise<AnimeDetails | null> {
  if (isDemoId(id)) return Promise.resolve(getDemoAnime(id) ?? null);

  return cached(`anime:${id}`, DETAILS_TTL_MS, async () => {
    const info = parseAnimeInfo(await fetchHtml(`${ANIMEGO_BASE}/anime/${id}`));
    const numericId = numericAnimeId(id);

    let episodesTotal = info.episodesTotal ?? 0;
    try {
      const player = await loadPlayer(numericId, 1);
      if (player.totalEpisodes > 0) episodesTotal = player.totalEpisodes;
    } catch {
      // Расписание может быть недоступно — берём количество серий со страницы.
    }

    return {
      id,
      title: info.title,
      titleOrig: info.titleOrig,
      year: info.year,
      posterUrl: info.posterUrl,
      rating: info.rating,
      ratingSource: 'animego',
      type: info.type,
      episodesTotal: episodesTotal || undefined,
      status: info.status,
      genres: info.genres,
      description: info.description,
      studios: info.studios,
      seasons: buildSeasons(episodesTotal),
      duration: info.duration,
      minimalAge: info.minimalAge,
    } satisfies AnimeDetails;
  });
}

export async function getTranslationsForAnime(
  details: AnimeDetails,
): Promise<TranslationOption[]> {
  if (isDemoId(details.id)) return details.translations ?? [];

  try {
    const translations = await loadTranslations(numericAnimeId(details.id));
    if (!translations.length) return details.translations ?? [];
    return [...translations].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  } catch (error) {
    console.warn('[animego] озвучки недоступны:', describeAnimeGoError(error));
    return details.translations ?? [];
  }
}

export async function getPlayerPayload(params: {
  id: string;
  episode?: number;
  translation?: number;
}): Promise<PlayerPayload> {
  const { id, episode = 1, translation } = params;

  if (isDemoId(id)) {
    throw new AnimeGoError('Демо-режим: поток недоступен без AnimeGO');
  }

  return cached(`stream:${id}:${episode}:${translation ?? 0}`, PLAYER_TTL_MS, async () => {
    const stream = await resolveStream({
      animeId: numericAnimeId(id),
      episode,
      translationId: translation,
    });

    return {
      stream: { src: stream.src, type: stream.type },
      translation: stream.translation,
      source: 'animego',
    } satisfies PlayerPayload;
  });
}
