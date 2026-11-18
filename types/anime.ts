/** Тип материала: фильм или сериал. */
export type AnimeKind = 'anime' | 'anime-serial';

/** Источник данных: живой каталог AnimeGO или встроенный демо-каталог. */
export type DataSource = 'animego' | 'demo';

export type RatingSource = 'animego' | 'shikimori' | 'kinopoisk' | 'imdb' | 'mydramalist';

export interface TranslationOption {
  /** ID озвучки на AnimeGO. */
  id: number;
  title: string;
  type: 'voice' | 'subtitles' | string;
  /** Плеер, из которого берётся поток: AniBoom, CVH и т.п. */
  player?: string;
}

export interface EpisodeInfo {
  episode: number;
  title?: string;
}

export interface SeasonInfo {
  season: number;
  title?: string;
  episodes: EpisodeInfo[];
}

export interface AnimeSummary {
  /** Внутренний id: slug страницы AnimeGO вместе с числовым id (`-1635`). */
  id: string;
  title: string;
  titleOrig?: string;
  year?: number;
  posterUrl?: string;
  rating?: number;
  ratingSource?: RatingSource;
  type?: AnimeKind;
  episodesTotal?: number;
  status?: string;
  genres?: string[];
  quality?: string;
  description?: string;
  translations?: TranslationOption[];
}

export interface AnimeDetails extends AnimeSummary {
  description?: string;
  studios?: string[];
  genres?: string[];
  seasons?: SeasonInfo[];
  duration?: number;
  minimalAge?: number;
}

export interface PlayerPayload {
  stream: {
    src: string;
    type: 'hls' | 'mp4';
  };
  translation?: TranslationOption;
  source: DataSource;
}

export interface SearchResult {
  items: AnimeSummary[];
  total: number;
  source: DataSource;
}

export interface CatalogSection {
  key: string;
  title: string;
  subtitle: string;
  href: string;
  items: AnimeSummary[];
}

export interface HomeData {
  featured?: AnimeSummary;
  sections: CatalogSection[];
  source: DataSource;
}
