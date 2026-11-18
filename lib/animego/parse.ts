import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';

import type { AnimeKind, AnimeSummary } from '@/types/anime';
import { ANIMEGO_BASE, AnimeGoError } from './http';

const clean = (value?: string | null) => (value ?? '').replace(/\s+/g, ' ').trim();

const absolute = (value?: string | null): string | undefined => {
  const url = clean(value);
  if (!url) return undefined;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${ANIMEGO_BASE}${url}`;
  return url;
};

const parseNumber = (value?: string | null): number | undefined => {
  const text = clean(value).replace(',', '.').replace(/[^\d.]/g, '');
  const number = Number.parseFloat(text);
  return Number.isFinite(number) ? number : undefined;
};

const typeFromLabel = (label?: string): AnimeKind | undefined => {
  const value = clean(label).toLowerCase();
  if (!value) return undefined;
  if (value.includes('фильм')) return 'anime';
  if (/сериал|тв|tv|ona|ova|спешл|special/.test(value)) return 'anime-serial';
  return undefined;
};

export interface ParsedCard extends AnimeSummary {
  /** Полный числовой id на AnimeGO (последняя часть slug). */
  animeId: string;
}

function readCard($: CheerioAPI, element: Cheerio<AnyNode>): ParsedCard | null {
  const link = element
    .find(
      'a.ani-grid__item-picture[href*="/anime/"], a.ani-grid__item-title a[href*="/anime/"], a.ani-list__item-picture[href*="/anime/"], a.ani-list__item-title a[href*="/anime/"], a[href^="/anime/"]',
    )
    .first();

  const href = link.attr('href') ?? '';
  const match = href.match(/^\/anime\/(.+)-(\d+)$/);
  if (!match) return null;

  const [, slug, animeId] = match;
  const img = element.find('img').first();
  const title =
    clean(element.find('.ani-grid__item-title a, .ani-list__item-title a').first().text()) ||
    clean(link.attr('title')) ||
    clean(img.attr('alt')) ||
    slug.replace(/-/g, ' ');

  const original = clean(element.find('.fw-lighter').first().text());

  const metaLinks = element.find(
    '.ani-grid__item-genres__link, .ani-list__item-genres__link, .anime-top__meta-item',
  );

  let type: AnimeKind | undefined;
  let year: number | undefined;

  metaLinks.each((_, meta) => {
    const node = $(meta);
    const hrefValue = node.attr('href') ?? '';
    const text = clean(node.text());

    if (!type && (hrefValue.includes('/anime/type/') || /^(сериал|фильм|ona|ova|спешл|tv)$/i.test(text))) {
      type = typeFromLabel(text);
    }

    const seasonMatch = hrefValue.match(/\/anime\/season\/(\d{4})/);
    if (seasonMatch) year = Number(seasonMatch[1]);
    if (!year && /^(19|20)\d{2}$/.test(text)) year = Number(text);
  });

  return {
    id: `${slug}-${animeId}`,
    animeId,
    title,
    titleOrig: original || undefined,
    posterUrl: absolute(img.attr('src') ?? img.attr('data-src')),
    rating: parseNumber(element.find('.rating-badge').first().text()),
    ratingSource: 'animego',
    year,
    type,
  };
}

/** Разбирает карточки из сеток `.ani-grid__item` и списков `.ani-list__item`. */
export function parseCards($: CheerioAPI, limit = 24): ParsedCard[] {
  const items: ParsedCard[] = [];
  const seen = new Set<string>();

  $('.ani-grid__item, .ani-list__item, article.anime-top__item').each((_, element) => {
    if (items.length >= limit) return;
    const card = readCard($, $(element));
    if (!card || seen.has(card.id)) return;
    seen.add(card.id);
    items.push(card);
  });

  return items;
}

export interface ParsedAnimeInfo {
  title: string;
  titleOrig?: string;
  posterUrl?: string;
  rating?: number;
  description?: string;
  genres: string[];
  studios: string[];
  type?: AnimeKind;
  status?: string;
  year?: number;
  episodesTotal?: number;
  minimalAge?: number;
  duration?: number;
  translationLabels: string[];
}

export function parseAnimeInfo(html: string): ParsedAnimeInfo {
  const $ = cheerio.load(html);
  const entity = $('.entity').first();

  if (!entity.length) {
    throw new AnimeGoError('Не удалось разобрать страницу тайтла AnimeGO', 'parse');
  }

  const title =
    clean(entity.find('.entity__title h1').first().text()) ||
    clean(entity.find('.entity__title').first().clone().children().remove().end().text());

  if (!title) {
    throw new AnimeGoError('На странице AnimeGO нет названия тайтла', 'parse');
  }

  const genres: string[] = [];
  const studios: string[] = [];
  const translationLabels: string[] = [];

  let type: AnimeKind | undefined;
  let status: string | undefined;
  let year: number | undefined;
  let episodesTotal: number | undefined;
  let minimalAge: number | undefined;
  let duration: number | undefined;

  const cells = entity.find('.entity-field').first().children('div');
  for (let index = 0; index < cells.length - 1; index += 2) {
    const label = clean(cells.eq(index).text());
    const valueCell = cells.eq(index + 1);
    const value = clean(valueCell.text());

    switch (label) {
      case 'Тип':
        type = typeFromLabel(value);
        break;
      case 'Эпизоды': {
        const numbers = value.match(/\d+/g);
        episodesTotal = numbers?.length ? Number(numbers[numbers.length - 1]) : undefined;
        break;
      }
      case 'Жанры':
        valueCell.find('a').each((_, node) => {
          const genre = clean($(node).text());
          if (genre) genres.push(genre);
        });
        break;
      case 'Статус':
        if (/онгоинг/i.test(value)) status = 'ongoing';
        else if (/анонс/i.test(value)) status = 'anons';
        else if (value) status = 'released';
        break;
      case 'Выпуск': {
        const match = value.match(/(19|20)\d{2}/);
        if (match) year = Number(match[0]);
        break;
      }
      case 'Возраст': {
        const match = value.match(/\d+/);
        if (match) minimalAge = Number(match[0]);
        break;
      }
      case 'Длительность': {
        const match = value.match(/\d+/);
        if (match) duration = Number(match[0]);
        break;
      }
      case 'Студия':
        if (value) studios.push(...value.split(',').map((item) => clean(item)).filter(Boolean));
        break;
      case 'Озвучка':
        valueCell.find('a').each((_, node) => {
          const labelText = clean($(node).text());
          if (labelText) translationLabels.push(labelText);
        });
        break;
      default:
        break;
    }
  }

  return {
    title,
    titleOrig: clean(entity.find('.entity__title-synonyms').first().text()) || undefined,
    posterUrl: absolute(entity.find('img.image__img').first().attr('src')),
    rating: parseNumber(entity.find('.entity-rating__value').first().text()),
    description: clean(entity.find('.description').first().text()) || undefined,
    genres: [...new Set(genres)],
    studios: [...new Set(studios)],
    type,
    status,
    year,
    episodesTotal,
    minimalAge,
    duration,
    translationLabels: [...new Set(translationLabels)],
  };
}

export interface ParsedVoiceProvider {
  player: 'aniboom' | 'cvh' | 'kodik' | 'other';
  embed: string;
}

export interface ParsedVoice {
  id: number;
  title: string;
  type: 'voice' | 'subtitles';
  providers: ParsedVoiceProvider[];
}

export interface ParsedPlayer {
  voices: ParsedVoice[];
  episodes: { number: number; videoId: string }[];
  totalEpisodes: number;
}

function providerName(value: string): ParsedVoiceProvider['player'] {
  const slug = value.toLowerCase();
  if (slug.includes('aniboom')) return 'aniboom';
  if (slug.includes('cvh')) return 'cvh';
  if (slug.includes('kodik')) return 'kodik';
  return 'other';
}

/**
 * Разбирает HTML из ответа `/player/{id}`:
 * кнопки озвучек (`data-ptranslation`) и список серий (`data-episode-number`).
 */
export function parsePlayer(content: string): ParsedPlayer {
  const $ = cheerio.load(content);
  const voices = new Map<number, ParsedVoice>();
  const episodes: { number: number; videoId: string }[] = [];

  $('button[data-ptranslation]').each((_, element) => {
    const button = $(element);
    const id = Number(button.attr('data-ptranslation'));
    const title = clean(button.attr('data-translation-title'));
    const embed = absolute(button.attr('data-player'));
    const playerLabel = clean(button.attr('data-provider-title') || button.attr('data-provider-slug'));

    if (!Number.isFinite(id) || !title || !embed) return;

    const existing = voices.get(id);
    const provider: ParsedVoiceProvider = {
      player: providerName(`${playerLabel} ${button.attr('data-provider-slug') ?? ''}`),
      embed,
    };

    if (existing) {
      existing.providers.push(provider);
      return;
    }

    voices.set(id, {
      id,
      title,
      type: /субтитр|сабы|sub/i.test(title) ? 'subtitles' : 'voice',
      providers: [provider],
    });
  });

  $('[data-episode-number][data-episode]').each((_, element) => {
    const node = $(element);
    const number = Number(node.attr('data-episode-number'));
    const videoId = clean(node.attr('data-episode'));
    if (!Number.isFinite(number) || !videoId) return;
    if (episodes.some((episode) => episode.number === number)) return;
    episodes.push({ number, videoId });
  });

  const totalEpisodes = episodes.reduce((max, episode) => Math.max(max, episode.number), 0);

  return {
    voices: [...voices.values()],
    episodes: episodes.sort((a, b) => a.number - b.number),
    totalEpisodes,
  };
}
