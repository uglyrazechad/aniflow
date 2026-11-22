/** Тёмная тема в стиле аниме-сервисов: глубокий фон, фиолетовый акцент, розовые детали. */
export const colors = {
  bg: '#08080c',
  surface: '#12121a',
  surfaceAlt: '#191924',
  border: '#262634',
  text: '#f4f4f8',
  textMuted: '#8b8ba0',
  accent: '#7c5cff',
  accentSoft: '#2b2456',
  pink: '#ff4f9a',
  success: '#3ddc97',
  danger: '#ff5c6c',
  gold: '#ffc94a',
  overlay: 'rgba(8,8,12,0.72)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  small: 13,
  body: 15,
  title: 18,
  heading: 22,
  hero: 28,
} as const;
