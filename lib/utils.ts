import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatYear(year?: number | null): string {
  return year ? String(year) : '—';
}

export function formatRating(rating?: number | null): string | null {
  if (typeof rating !== 'number' || Number.isNaN(rating)) return null;
  return rating.toFixed(1).replace('.0', '.0');
}

export function formatDuration(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} мин`;
  return `${hours} ч ${rest ? `${rest} мин` : ''}`.trim();
}

export function pluralize(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

export function typeLabel(type?: string): string {
  switch (type) {
    case 'anime-serial':
      return 'Сериал';
    case 'anime':
      return 'Фильм';
    case 'anime-movie':
      return 'Фильм';
    default:
      return 'Аниме';
  }
}

export function statusLabel(status?: string): string | null {
  switch (status) {
    case 'ongoing':
      return 'Онгоинг';
    case 'released':
      return 'Завершён';
    case 'anons':
      return 'Анонс';
    default:
      return null;
  }
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Убирает HTML из описаний и нормализует пробелы. */
export function plainText(value?: string | null): string | undefined {
  if (!value) return undefined;

  const text = value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return text || undefined;
}

export const isDemoId = (id: string) => id.startsWith('demo-');
