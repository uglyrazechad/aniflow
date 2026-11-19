export interface ProfileTheme {
  key: string;
  name: string;
  css: string;
}

/** Готовые фоны профиля: без загрузки картинок и лишних запросов. */
export const PROFILE_THEMES: ProfileTheme[] = [
  {
    key: 'aurora',
    name: 'Аврора',
    css: 'radial-gradient(120% 120% at 15% 0%, #6d28d9 0%, transparent 55%), radial-gradient(120% 120% at 85% 15%, #0ea5e9 0%, transparent 50%), linear-gradient(135deg, #140b2b 0%, #07111f 100%)',
  },
  {
    key: 'sunset',
    name: 'Закат',
    css: 'radial-gradient(110% 110% at 80% 0%, #f97316 0%, transparent 55%), radial-gradient(100% 100% at 10% 20%, #db2777 0%, transparent 55%), linear-gradient(135deg, #22101c 0%, #0d0810 100%)',
  },
  {
    key: 'sakura',
    name: 'Сакура',
    css: 'radial-gradient(120% 120% at 20% 10%, #f472b6 0%, transparent 55%), radial-gradient(120% 120% at 90% 30%, #a78bfa 0%, transparent 50%), linear-gradient(135deg, #2a1024 0%, #100616 100%)',
  },
  {
    key: 'forest',
    name: 'Лес',
    css: 'radial-gradient(120% 120% at 10% 0%, #059669 0%, transparent 55%), radial-gradient(120% 120% at 90% 20%, #22d3ee 0%, transparent 45%), linear-gradient(135deg, #071c17 0%, #050d12 100%)',
  },
  {
    key: 'noir',
    name: 'Нуар',
    css: 'radial-gradient(120% 120% at 50% 0%, #475569 0%, transparent 60%), linear-gradient(180deg, #111827 0%, #020617 100%)',
  },
  {
    key: 'ember',
    name: 'Угли',
    css: 'radial-gradient(110% 110% at 30% 0%, #dc2626 0%, transparent 55%), radial-gradient(120% 120% at 90% 40%, #f59e0b 0%, transparent 45%), linear-gradient(135deg, #200a0a 0%, #0b0505 100%)',
  },
];

export const PROFILE_ACCENTS = [
  '#7c5cff',
  '#22d3ee',
  '#f472b6',
  '#34d399',
  '#f59e0b',
  '#fb7185',
  '#a3e635',
  '#e879f9',
];

const isImageUrl = (value: string) =>
  value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/api/uploads/');

/** CSS-фон профиля: пресет, загруженная картинка или значение по умолчанию. */
export function backgroundStyle(value?: string | null): { backgroundImage: string } {
  if (value && isImageUrl(value)) {
    return { backgroundImage: `url("${value.replace(/"/g, '%22')}")` };
  }

  const preset = PROFILE_THEMES.find((theme) => theme.key === value) ?? PROFILE_THEMES[0];
  return { backgroundImage: preset.css };
}
