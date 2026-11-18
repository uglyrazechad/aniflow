# AniFlow — аниме-сайт с плеером AnimeGO

Современный каталог аниме на Next.js (App Router) с поиском, подборками,
адаптивной вёрсткой, тёмной темой по умолчанию и HLS-плеером.
Каталог, карточки, озвучки и видеопотоки берутся с сайта AnimeGO —
без API-токенов и сторонних SDK.

![stack](https://img.shields.io/badge/Next.js-15-black) ![stack](https://img.shields.io/badge/React-19-blue) ![stack](https://img.shields.io/badge/Tailwind-3.4-38bdf8) ![stack](https://img.shields.io/badge/TypeScript-5-3178c6)

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Откройте http://localhost:3000.

Production-сборка:

```bash
npm run build
npm start
```

Демо-постеры (SVG в `public/demo/`) пересобираются командой `npm run demo:posters`.

## Настройка

Обе переменные необязательны:

```env
ANIMEGO_MIRROR=https://animego.me
SITE_URL=https://example.com
```

По умолчанию используется `https://animego.me`, а `SITE_URL` — `http://localhost:3000`.
Токены не нужны.

## Как это работает

- **Каталог.** Главная собирает подборки с `/anime/top-250`,
  `/anime/season/{год}` и `/anime/status/ongoing`.
- **Поиск.** `GET /search/anime?q=...` парсится через `cheerio`.
- **Тайтл.** Страница `/anime/{slug}-{id}` даёт название, постер, рейтинг,
  жанры, статус, студию, описание и количество серий.
- **Озвучки.** XHR-запрос `/player/{id}` возвращает HTML со списком озвучек и
  серий; для каждой серии — `/player/videos/{videoId}`.
- **Поток.** Приоритет у AniBoom (HLS), затем CVH (HLS или MP4). Если выбранная
  озвучка не отдаёт поток, сервер пробует ещё пару доступных озвучек и сообщает
  в ответе, какая использована. Кнопки Kodik на AnimeGO игнорируются.
- **Прокси.** CDN AniBoom/CVH не отдают CORS для сторонних origin, поэтому
  `app/api/stream/route.ts` переписывает `.m3u8` (варианты, аудиогруппы, ключи,
  относительные сегменты) и проксирует сегменты с того же origin.
- **Плеер.** `hls.js` с адаптивным качеством: уровни переключаются без
  перезапуска, есть «Авто», горячие клавиши и fullscreen.
- **Кэш.** In-memory TTL-кэш в `lib/animego/cache.ts` (поиск 5 мин, списки
  15 мин, тайтлы 30 мин, потоки 3–10 мин) склеивает одинаковые параллельные
  запросы.

Если AnimeGO недоступен или изменил разметку, включается встроенный
демо-каталог и на страницах показывается плашка «Демо-режим».

## Деплой (работает без вашего компьютера)

Приложению нужен Node.js-сервер: оно парсит AnimeGO и проксирует видео. Подойдёт
любой хостинг с постоянным Node-процессом.

### Render (бесплатно, проще всего)

1. Залейте проект в репозиторий GitHub.
2. На [render.com](https://render.com) → **New → Blueprint** → выберите репозиторий:
   Render прочитает `render.yaml` и создаст веб-сервис.
   Либо **New → Web Service** и вручную: build `npm ci --include=dev && npm run build`,
   start `npm start`, healthcheck `/api/health`.
3. Готово: сайт открывается по адресу вида `https://aniflow.onrender.com`
   с телефона, ноутбука и любого ПК.

Бесплатный план Render засыпает после 15 минут без запросов, первый запуск после
сна занимает до минуты. Чтобы сайт не спал, повесьте бесплатный монитор
(UptimeRobot, cron-job.org) на `/api/health` раз в 10 минут.

`SITE_URL` Render подставит сам (`RENDER_EXTERNAL_URL`); `ANIMEGO_MIRROR` можно
задать в Variables, если основное зеркало недоступно.

### VPS + Docker (всегда включён, ~4 €/мес)

1. Направьте A-запись домена на IP сервера.
2. На сервере с Docker:

```bash
git clone <ваш-репозиторий> aniflow && cd aniflow
printf 'SITE_HOST=anime.example.com\n' > .env
docker compose up -d --build
```

Caddy из `compose.yaml` сам получит HTTPS-сертификат и проксирует запросы без
буферизации (важно для видео). Подойдёт любой VPS в Европе/России — главное,
чтобы с него открывался `animego.me`.

Без домена можно запустить только приложение:

```bash
docker build -t aniflow .
docker run -d --name aniflow --restart unless-stopped -p 3000:3000 aniflow
```

### Vercel

Технически запускается, но серверные функции имеют лимиты на размер ответа и
время, а видео идёт через прокси — на бесплатном плане это быстро упрётся в
лимиты. Для постоянного просмотра берите Render или VPS.

## Структура

```
app/
  page.tsx                   главная: hero + подборки
  search/page.tsx            страница поиска
  anime/[id]/page.tsx        карточка тайтла + плеер
  api/search/route.ts        подсказки поиска
  api/player/route.ts        ссылка на поток для озвучки/серии
  api/stream/route.ts        прокси HLS/MP4 и перезапись плейлистов
  layout.tsx                 метаданные, темы, шапка/подвал, toasts
components/
  site-header.tsx            навигация + мобильное меню
  search-box.tsx             поиск с дебаунсом и Ctrl+K
  hero.tsx                   hero-блок с CTA
  anime-card.tsx             карточка тайтла
  anime-grid.tsx             сетка с анимацией
  anime-section.tsx          секция подборки
  player/video-player.tsx    HLS-плеер (hls.js) с адаптивным качеством
  player/player-section.tsx  озвучка/серия/плеер
  ui/*                       shadcn/ui компоненты
lib/
  animego/http.ts            HTTP-слой, заголовки, таймауты, ошибки
  animego/parse.ts           парсеры карточек, тайтла, плеера
  animego/player.ts          озвучки, AniBoom/CVH, сборка потока
  animego/api.ts             поиск, каталог, тайтл, payload плеера
  animego/cache.ts           in-memory TTL-кэш
  demo-data.ts               демо-каталог
  utils.ts                   cn, форматирование
types/anime.ts               общие типы
```

## API

- `GET /api/search?q=...&limit=...` — подсказки поиска.
- `GET /api/player?id=...&episode=...&translation=...` — `{ stream: { src, type },
  translation, source }`.
- `GET /api/stream?url=...&ref=...` — прокси видео; принимает только `https`,
  отклоняет приватные адреса, поддерживает `Range` для MP4.
- `GET /api/health` — проверка живости для хостинга и мониторинга.

## Ограничения

- AnimeGO может быть недоступен из некоторых сетей — тогда работает демо-режим.
- У части тайтлов (обычно у фильмов) AnimeGO отдаёт видео только через Kodik.
  Такие озвучки скрыты, и плеер честно сообщает, что потока нет, — это не сбой
  сайта.
- Разметка AnimeGO может меняться; парсеры стоит проверять после изменений.
- Сайт не хранит видео: все материалы предоставляет AnimeGO.
