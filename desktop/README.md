# AniHub для Windows

Отдельное приложение (Electron) с тем же интерфейсом, что и Android-версия: каталог,
плеер, комнаты. Сайт не открывается — UI лежит локально в `web/`, данные идут в API.

## Сборка

```powershell
# 1. Собрать веб-бандл мобильного приложения
cd ..\mobile
npx expo export --platform web --output-dir web-dist

# 2. Скопировать в desktop/web
robocopy .\web-dist ..\desktop\web /MIR

# 3. Собрать exe (нужен npm install в этой папке)
cd ..\desktop
npm install
node node_modules\electron\install.js   # если npm не запустил postinstall
npm run dist
```

Артефакты: `release/anihub-windows.exe` (портативный) и `release/anihub-setup.exe`.

Сборку лучше запускать из ASCII-пути (например, `C:\anihub-desktop`): на путях с
кириллицей npm/electron-builder иногда ловят блокировки файлов.

## Что внутри

- `main.js` — окно, свой протокол `app://local/`, локальные файлы, внешние ссылки в
  системный браузер.
- `web/` — статическая сборка Expo Router (генерируется, в git не хранится).
- API-адрес зашит в `mobile/app.json` → `expo.extra.apiUrl`.