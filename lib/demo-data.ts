import type { AnimeDetails, AnimeSummary, HomeData, TranslationOption } from '@/types/anime';

/**
 * Демонстрационный каталог.
 * Используется только как fallback, когда AnimeGO недоступен (нет сети,
 * блокировка, изменилась разметка). UI при этом остаётся полностью рабочим,
 * а на страницах показывается плашка «демо-режим».
 */

const voice = (id: number, title: string): TranslationOption => ({
  id,
  title,
  type: 'voice',
});

const demoTracks: TranslationOption[] = [
  voice(767, 'AniLibria'),
  voice(488, 'SHIZA Project'),
  voice(1423, 'Studio Band'),
  voice(2381, 'AniDUB'),
];

const serialSeasons = (episodes: number, season = 1) => [
  {
    season,
    title: 'Сезон 1',
    episodes: Array.from({ length: Math.min(episodes, 12) }, (_, index) => ({
      episode: index + 1,
    })),
  },
];

type DemoSeed = Omit<AnimeDetails, 'translations' | 'seasons' | 'id' | 'posterUrl'> & {
  episodes?: number;
  poster: string;
};

const seeds: DemoSeed[] = [
  {
    title: 'Атака титанов',
    titleOrig: 'Shingeki no Kyojin',
    year: 2013,
    rating: 9.0,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'released',
    episodes: 87,
    genres: ['Боевик', 'Драма', 'Фэнтези'],
    studios: ['Wit Studio', 'MAPPA'],
    quality: 'BDRip 1080p',
    minimalAge: 16,
    poster: '/demo/poster-1.svg',
    description:
      'Человечество живёт за гигантскими стенами, спасаясь от титанов — исполинов, пожирающих людей. Юный Эрен Йегер теряет всё и вступает в разведкорпус, чтобы узнать правду о мире за стенами.',
  },
  {
    title: 'Клинок, рассекающий демонов',
    titleOrig: 'Kimetsu no Yaiba',
    year: 2019,
    rating: 8.6,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'released',
    episodes: 26,
    genres: ['Боевик', 'Сёнэн', 'Сверхъестественное'],
    studios: ['ufotable'],
    quality: 'BDRip 1080p',
    minimalAge: 16,
    poster: '/demo/poster-2.svg',
    description:
      'После гибели семьи Танджиро отправляется в путь с сестрой, обращённой в демона. Он становится истребителем демонов, чтобы вернуть ей человеческий облик.',
  },
  {
    title: 'Ванпанчмен',
    titleOrig: 'One Punch Man',
    year: 2015,
    rating: 8.7,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'ongoing',
    episodes: 12,
    genres: ['Боевик', 'Комедия', 'Пародия'],
    studios: ['Madhouse', 'J.C.Staff'],
    quality: 'WEB-DL 1080p',
    minimalAge: 16,
    poster: '/demo/poster-3.svg',
    description:
      'Сайтама тренировался в одиночестве в течение трёх лет и стал героем, способным уложить любого противника одним ударом. Слава же обходит его стороной.',
  },
  {
    title: 'Магическая битва',
    titleOrig: 'Jujutsu Kaisen',
    year: 2020,
    rating: 8.5,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'ongoing',
    episodes: 24,
    genres: ['Боевик', 'Мистика', 'Тёмное фэнтези'],
    studios: ['MAPPA'],
    quality: 'BDRip 1080p',
    minimalAge: 16,
    poster: '/demo/poster-4.svg',
    description:
      'Юдзи Итадори проглатывает проклятый палец и делит тело с ancient-проклятием Сукуной. Теперь его путь — школа магии и охота на проклятых духов.',
  },
  {
    title: 'Человек-бензопила',
    titleOrig: 'Chainsaw Man',
    year: 2022,
    rating: 8.6,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'ongoing',
    episodes: 12,
    genres: ['Боевик', 'Тёмное фэнтези', 'Сёнэн'],
    studios: ['MAPPA'],
    quality: 'BDRip 1080p',
    minimalAge: 18,
    poster: '/demo/poster-5.svg',
    description:
      'Дэндзи мечтает о нормальной жизни, но вынужден промышлять охотой на демонов. После предательства он перерождается с силой демона-бензопилы.',
  },
  {
    title: 'Тетрадь смерти',
    titleOrig: 'Death Note',
    year: 2006,
    rating: 8.6,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'released',
    episodes: 37,
    genres: ['Мистика', 'Триллер', 'Психологическое'],
    studios: ['Madhouse'],
    quality: 'BDRip 1080p',
    minimalAge: 16,
    poster: '/demo/poster-6.svg',
    description:
      'Школьник Лайт Ягами получает тетрадь, убивающую любого, чьё имя в неё записано. Начинается интеллектуальная дуэль с загадочным детективом L.',
  },
  {
    title: 'Стальной алхимик: Братство',
    titleOrig: 'Fullmetal Alchemist: Brotherhood',
    year: 2009,
    rating: 9.2,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'released',
    episodes: 64,
    genres: ['Приключения', 'Драма', 'Фэнтези'],
    studios: ['Bones'],
    quality: 'BDRip 1080p',
    minimalAge: 12,
    poster: '/demo/poster-7.svg',
    description:
      'Братья Элрики поплатились телами за запретную алхимию. Теперь они ищут философский камень и раскрывают заговор, грозящий всей стране.',
  },
  {
    title: 'Евангелион',
    titleOrig: 'Neon Genesis Evangelion',
    year: 1995,
    rating: 8.4,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'released',
    episodes: 26,
    genres: ['Меха', 'Психологическое', 'Фантастика'],
    studios: ['Gainax', 'Tatsunoko'],
    quality: 'BDRip 1080p',
    minimalAge: 16,
    poster: '/demo/poster-8.svg',
    description:
      'Подросток Синдзи Икари становится пилотом Евы, чтобы защитить Токио-3 от Ангелов. За сражениями скрывается история о травме и одиночестве.',
  },
  {
    title: 'Ковбой Бибоп',
    titleOrig: 'Cowboy Bebop',
    year: 1998,
    rating: 8.9,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'released',
    episodes: 26,
    genres: ['Боевик', 'Космос', 'Джаз'],
    studios: ['Sunrise'],
    quality: 'BDRip 1080p',
    minimalAge: 16,
    poster: '/demo/poster-9.svg',
    description:
      'Экипаж «Бибопа» — охотники за головами, которые бороздят космос в поисках награды и способа убежать от собственного прошлого.',
  },
  {
    title: 'Моя геройская академия',
    titleOrig: 'Boku no Hero Academia',
    year: 2016,
    rating: 7.9,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'released',
    episodes: 13,
    genres: ['Боевик', 'Супергерои', 'Школа'],
    studios: ['Bones'],
    quality: 'WEB-DL 1080p',
    minimalAge: 12,
    poster: '/demo/poster-10.svg',
    description:
      'В мире, где почти у каждого есть суперсила, Изуку Мидория родился без причуды. Но встреча с легендарным Всемогущим меняет его судьбу.',
  },
  {
    title: 'Судьба: Ночь схватки. Прикосновение небес',
    titleOrig: "Gekijouban Fate/Stay Night: Heaven's Feel - I. Presage Flower",
    year: 2017,
    rating: 8.3,
    ratingSource: 'shikimori',
    type: 'anime',
    status: 'released',
    duration: 120,
    genres: ['Фэнтези', 'Боевик', 'Драма'],
    studios: ['ufotable'],
    quality: 'BDRip 1080p',
    minimalAge: 16,
    poster: '/demo/poster-11.svg',
    description:
      'Седьмая война Святого Грааля начинается в Фуюки. Широ Эмия оказывается втянут в конфликт магов и слуг, где цена победы — всё, что ему дорого.',
  },
  {
    title: 'Семья шпиона',
    titleOrig: 'Spy x Family',
    year: 2022,
    rating: 8.5,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'ongoing',
    episodes: 12,
    genres: ['Комедия', 'Боевик', 'Сёмэй'],
    studios: ['Wit Studio', 'CloverWorks'],
    quality: 'WEB-DL 1080p',
    minimalAge: 12,
    poster: '/demo/poster-12.svg',
    description:
      'Шпион по прозвищу Сумерек вынужден создать фиктивную семью. Вот только жена — наёмная убийца, а дочь читает мысли.',
  },
  {
    title: 'Токийский гуль',
    titleOrig: 'Tokyo Ghoul',
    year: 2014,
    rating: 7.8,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'released',
    episodes: 12,
    genres: ['Ужасы', 'Тёмное фэнтези', 'Драма'],
    studios: ['Pierrot'],
    quality: 'BDRip 1080p',
    minimalAge: 18,
    poster: '/demo/poster-13.svg',
    description:
      'После встречи с гулем Кэн Канэки становится получеловеком-полугулем и пытается сохранить рассудок между двумя мирами.',
  },
  {
    title: 'Врата Штайна',
    titleOrig: 'Steins;Gate',
    year: 2011,
    rating: 9.0,
    ratingSource: 'shikimori',
    type: 'anime-serial',
    status: 'released',
    episodes: 24,
    genres: ['Фантастика', 'Триллер', 'Драма'],
    studios: ['White Fox'],
    quality: 'BDRip 1080p',
    minimalAge: 16,
    poster: '/demo/poster-14.svg',
    description:
      'Самопровозглашённый учёный Окабэ случайно изобретает способ отправлять сообщения в прошлое. Игра с временем оборачивается трагедией.',
  },
];

export const demoAnime: AnimeDetails[] = seeds.map((seed, index) => {
  const { poster, episodes: episodesSeed, ...rest } = seed;
  const id = `demo-${index + 1}`;
  const episodes = episodesSeed ?? 0;

  return {
    ...rest,
    id,
    posterUrl: poster,
    episodesTotal: seed.type === 'anime' ? undefined : episodes,
    seasons: seed.type === 'anime' ? [] : serialSeasons(episodes),
    translations: demoTracks,
  };
});

export const demoById = new Map(demoAnime.map((anime) => [anime.id, anime]));

export function getDemoAnime(id: string): AnimeDetails | undefined {
  return demoById.get(id);
}

export function searchDemo(query: string, limit = 30): AnimeSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return demoAnime.slice(0, limit);

  return demoAnime
    .filter((anime) =>
      [anime.title, anime.titleOrig].filter(Boolean).some((value) =>
        value!.toLowerCase().includes(normalized),
      ),
    )
    .slice(0, limit);
}

export const demoFeatured: AnimeSummary = demoAnime[0];

export function getDemoHome(): HomeData {
  const sections = [
    {
      key: 'popular',
      title: 'Популярное',
      subtitle: 'Высокие оценки сообщества',
      href: '/search',
      items: [...demoAnime].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 10),
    },
    {
      key: 'new',
      title: 'Новинки',
      subtitle: 'Свежие поступления каталога',
      href: '/search',
      items: [...demoAnime].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 10),
    },
    {
      key: 'ongoing',
      title: 'Онгоинги',
      subtitle: 'Сейчас выходят новые серии',
      href: '/search',
      items: demoAnime.filter((anime) => anime.status === 'ongoing').slice(0, 10),
    },
  ];

  return { featured: demoFeatured, sections, source: 'demo' };
}
