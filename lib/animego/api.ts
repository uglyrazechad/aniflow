import * as cheerio from 'cheerio';

import type {
  AnimeDetails,
  AnimeSummary,
  CatalogSection,
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
      subtitle: 'Топ-250 AnimeGO',
      path: '/anime/top-250',
    },
    {
      key: 'new',
      title: 'Новинки сезона',
      subtitle: 'Свежие тайтлы текущего сезона',
      path: `/anime/season/${year}`,
    },
    {
      key: 'ongoing',
      title: 'Онгоинги',
      subtitle: 'Сейчас выходят новые серии',
      path: '/anime/status/ongoing',
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
      href: '/search',
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
