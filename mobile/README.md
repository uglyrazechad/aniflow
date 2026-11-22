# AniHub Mobile

Android-приложение AniHub на Expo SDK 58 / React Native 0.88: каталог, поиск,
карточки, плеер и комнаты совместного просмотра. Аккаунты, избранное, история,
озвучки и видеопотоки — общие с сайтом.

## Что внутри

- `src/app/` — экраны Expo Router: главная, поиск, тайтл, плеер, профиль,
  избранное, вход/регистрация и комнаты (`room/create`, `room/join`, `room/[slug]`).
- `src/lib/` — API-клиент, авторизация, push, хранение токена, WS-комната и sync.
- `src/components/` — UI и комната: видео, чат, участники, настройки.

## Запуск

Сначала поднимите сайт — мобильное приложение ходит в его REST API и WebSocket:

```bash
cd ..
npm install
npm run build
npm start          # :3000 front, :3010 Next, WS /ws/<slug>
```

Потом приложение:

```bash
cd mobile
npm install
npm start          # Expo dev server, сканируйте QR в Expo Go
```

Для Android-эмулятора API по умолчанию — `http://10.0.2.2:3000`, для iOS/web —
`http://localhost:3000`. На реальном телефоне укажите адрес компьютера в той же
Wi-Fi сети:

```bash
# Windows: узнайте IPv4 через ipconfig
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.42:3000"
npm start
```

Либо пропишите адрес в `app.json` → `expo.extra.apiUrl`. Для релизной сборки
нужен HTTPS-домен: Android блокирует cleartext-HTTP в release.

Проверки:

```bash
npx tsc --noEmit
npx expo lint
```

## Комнаты

- Создание: профиль → «Новая комната» → поиск тайтла, серия, публичная/приватная.
- Вход: код комнаты из шапки, приглашение или deep link `anihub://room/<slug>`.
- Сервер — источник истины: пауза, перемотка, серия, озвучка и скорость
  синхронизируются по серверному времени; дрейф правится плавно (±2 %), при
  расхождении больше 0.5 с — seek. Позднее подключение сразу получает позицию.
- Хост может включить «только хост», паузу при буферизации, кик/бан/мьют и
  передать роль хоста. При выходе хоста роль переходит следующему участнику.
- Комнаты хранятся в `../data/rooms.json` и живут 12 часов после опустошения.
  Для нескольких инстансов задайте `REDIS_URL` и установите `ioredis` в корне
  сайта — снимок комнат будет уходить в Redis.

## Push-уведомления

Приглашения отправляются через Expo Push. В Expo Go на Android удалённые push
не работают — нужна development/release сборка и projectId Expo:

```bash
npx eas-cli@latest init        # создаст projectId в app.json
npx eas-cli@latest build -p android --profile preview
```

Пока `extra.eas.projectId` не задан, приложение работает без push и пишет
предупреждение в консоль. Пользователь включает уведомления в профиле.

## Сборка

```bash
npx eas-cli@latest build -p android --profile preview     # APK
npx eas-cli@latest build -p android --profile production  # AAB
```

`preview` собирает внутренний APK, `production` — стор-версию с автоинкрементом.
Локальная нативная сборка: `npx expo run:android` (нужен Android Studio/SDK).