import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type {
  AnimeDetails,
  AnimeSummary,
  CatalogPage,
  FavoriteEntry,
  HomeData,
  PlayerPayload,
  RoomInfo,
  SafeUser,
  TranslationOption,
  WatchProgress,
} from './types';

const fallback = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

const configured =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  fallback;

export const API_URL = String(configured).replace(/\/+$/, '');

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function roomSocketUrl(slug: string): string {
  return `${API_URL.replace(/^http/i, 'ws')}/ws/${slug}`;
}

export class ApiError extends Error {
  status: number;
  needsVerification: boolean;

  constructor(message: string, status: number, needsVerification = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.needsVerification = needsVerification;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal, timeoutMs = 20000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(absoluteUrl(path), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? safeJson(text) : null;

    if (!response.ok) {
      const payload = (data ?? {}) as { error?: string; message?: string; needsVerification?: boolean };
      throw new ApiError(
        payload.error || payload.message || `Ошибка ${response.status}`,
        response.status,
        Boolean(payload.needsVerification),
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as { name?: string })?.name === 'AbortError') {
      throw new ApiError('Сервер не ответил. Проверьте сеть.', 0);
    }
    throw new ApiError('Нет связи с сервером', 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export interface AuthResponse {
  token: string;
  expiresAt: number;
  user: SafeUser;
}

export interface RegisterResponse {
  token?: string;
  expiresAt?: number;
  user?: SafeUser;
  needsVerification?: boolean;
  email?: string;
  message?: string;
}

export const api = {
  home: () => request<HomeData>('/api/home'),

  catalog: (params: {
    genre?: string;
    status?: string;
    year?: number;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params.genre) query.set('genre', params.genre);
    if (params.status) query.set('status', params.status);
    if (params.year) query.set('year', String(params.year));
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return request<CatalogPage>(`/api/catalog?${query.toString()}`, { timeoutMs: 30000 });
  },

  search: (q: string, limit = 24) =>
    request<{ items: AnimeSummary[]; total: number; source: string }>(
      `/api/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { timeoutMs: 30000 },
    ),

  anime: (id: string) =>
    request<{ anime: AnimeDetails; translations: TranslationOption[] }>(
      `/api/anime/${encodeURIComponent(id)}`,
      { timeoutMs: 40000 },
    ),

  player: (params: { id: string; episode: number; translation?: number | null }) => {
    const query = new URLSearchParams({ id: params.id, episode: String(params.episode) });
    if (params.translation) query.set('translation', String(params.translation));
    return request<PlayerPayload>(`/api/player?${query.toString()}`, { timeoutMs: 40000 }).then(
      (payload) => ({ ...payload, stream: { ...payload.stream, src: absoluteUrl(payload.stream.src) } }),
    );
  },

  login: (login: string, password: string) =>
    request<AuthResponse>('/api/mobile/login', {
      method: 'POST',
      body: { login, password },
    }),

  register: (email: string, password: string, displayName?: string) =>
    request<RegisterResponse>('/api/mobile/register', {
      method: 'POST',
      body: { email, password, displayName },
    }),

  verifyEmail: (email: string, code: string) =>
    request<{ user: SafeUser; verified: boolean }>('/api/auth/verify-email', {
      method: 'POST',
      body: { email, code },
    }),

  resendVerify: (email: string) =>
    request<{ ok: boolean; verified: boolean }>('/api/auth/resend-verify', {
      method: 'POST',
      body: { email },
    }),

  me: (token: string) => request<{ user: SafeUser }>('/api/mobile/me', { token }),

  logout: (token: string) =>
    request<{ ok: boolean }>('/api/mobile/logout', { method: 'POST', token }),

  registerPushToken: (token: string, pushToken: string) =>
    request<{ ok: boolean }>('/api/mobile/push', {
      method: 'POST',
      token,
      body: { token: pushToken },
    }),

  removePushToken: (token: string, pushToken: string) =>
    request<{ ok: boolean }>('/api/mobile/push', {
      method: 'DELETE',
      token,
      body: { token: pushToken },
    }),

  invite: (token: string, payload: { username: string; slug: string; roomName?: string }) =>
    request<{ ok: boolean; delivered?: number; reason?: string; message?: string }>(
      '/api/mobile/invite',
      { method: 'POST', token, body: payload },
    ),

  favorites: (token?: string | null) =>
    request<{ items: FavoriteEntry[]; authorized: boolean }>('/api/list', { token }),

  addFavorite: (
    token: string,
    anime: { id: string; title: string; posterUrl?: string; year?: number; rating?: number },
  ) => request<{ ok: boolean }>('/api/list', { method: 'POST', token, body: { anime } }),

  progress: (token?: string | null) =>
    request<{ items: WatchProgress[]; authorized: boolean }>('/api/progress', { token }),

  saveProgress: (token: string, entry: WatchProgress) =>
    request<{ ok: boolean }>('/api/progress', { method: 'PUT', token, body: { entry } }),

  createRoom: (
    token: string | null,
    payload: {
      animeId?: string | number | null;
      name: string;
      isPublic: boolean;
      password?: string;
      maxMembers?: number;
      episode?: number;
    },
  ) => request<{ slug: string; hostId: string | null }>('/api/rooms/create', {
    method: 'POST',
    token,
    body: payload,
  }),

  room: (slug: string) => request<RoomInfo>(`/api/rooms/${encodeURIComponent(slug)}`),

  updateRoom: (
    token: string | null,
    slug: string,
    payload: {
      userId?: string;
      name?: string;
      isPublic?: boolean;
      password?: string | null;
      maxMembers?: number;
    },
  ) => request<RoomInfo>(`/api/rooms/${encodeURIComponent(slug)}`, { method: 'PATCH', token, body: payload }),
};

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Неизвестная ошибка';
}
