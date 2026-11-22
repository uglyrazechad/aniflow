export interface TranslationOption {
  id: number;
  title: string;
  type: 'voice' | 'subtitles' | string;
  player?: string;
}

export interface AnimeSummary {
  id: string;
  title: string;
  titleOrig?: string;
  year?: number;
  posterUrl?: string;
  rating?: number;
  ratingSource?: string;
  type?: 'anime' | 'anime-serial';
  episodesTotal?: number;
  status?: string;
  genres?: string[];
  quality?: string;
  description?: string;
  translations?: TranslationOption[];
}

export interface SeasonInfo {
  season: number;
  title?: string;
  episodes: { episode: number; title?: string }[];
}

export interface AnimeDetails extends AnimeSummary {
  studios?: string[];
  seasons?: SeasonInfo[];
  duration?: number;
  minimalAge?: number;
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
  source: 'animego' | 'demo';
}

export interface GenreOption {
  slug: string;
  title: string;
}

export interface CatalogPage {
  items: AnimeSummary[];
  page: number;
  hasMore: boolean;
  source: string;
  genres: GenreOption[];
  statuses: GenreOption[];
}

export interface PlayerPayload {
  stream: { src: string; type: 'hls' | 'mp4' };
  translation?: TranslationOption;
  source: string;
}

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  createdAt: number;
  emailVerified: boolean;
  profile: {
    displayName: string;
    bio?: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    background?: string;
    accent?: string;
  };
}

export interface FavoriteEntry {
  id: string;
  title: string;
  posterUrl?: string;
  addedAt: number;
}

export interface WatchProgress {
  id: string;
  title: string;
  posterUrl?: string;
  season: number;
  episode: number;
  translationId: number;
  translationTitle?: string;
  position: number;
  duration: number;
  updatedAt: number;
}

/** --- Комнаты --- */

export interface RoomState {
  episode: number;
  time: number;
  paused: boolean;
  playbackRate?: number;
  quality: string | null;
  translationId: number | null;
  updatedBy: string | null;
  hostMode: boolean;
  pauseOnBuffering?: boolean;
  busy: string | null;
  waiting?: { userId: string; nick: string }[];
  serverTime: number;
}

export interface RoomMember {
  userId: string;
  nick: string;
  isHost: boolean;
  muted: boolean;
  joinedAt: number;
  waiting?: boolean;
  authed?: boolean;
}

export interface RoomMessage {
  id: number;
  userId: string;
  nick: string;
  text: string;
  emoji: string | null;
  time: number;
  system?: string;
}

export interface RoomInfo {
  slug: string;
  hostId: string | null;
  animeId: string | number | null;
  name: string;
  isPublic: boolean;
  maxMembers: number;
  createdAt: number;
  state: RoomState;
  members: RoomMember[];
  messages: RoomMessage[];
}

export interface RoomEvent {
  type: string;
  [key: string]: unknown;
}

export type ConnectionStatus = 'connecting' | 'online' | 'offline';
