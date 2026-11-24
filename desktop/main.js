const { app: electronApp, BrowserWindow, protocol, net, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SCHEME = 'app';
const WEB_ROOT = path.join(__dirname, 'web');
const ENTRY = path.join(WEB_ROOT, 'index.html');

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

/** Любой путь внутри app:// отдаётся из локальной сборки, а неизвестные — на index.html. */
function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, '');
  const candidate = path.join(WEB_ROOT, clean);
  if (!candidate.startsWith(WEB_ROOT)) return ENTRY;
  if (clean && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  return ENTRY;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'AniHub',
    backgroundColor: '#0b0b12',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${SCHEME}://`)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(`${SCHEME}://local/index.html`);
  return win;
}

if (!electronApp.requestSingleInstanceLock()) {
  electronApp.quit();
} else {
  electronApp.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  electronApp.whenReady().then(() => {
    protocol.handle(SCHEME, (request) => {
      const url = new URL(request.url);
      return net.fetch(pathToFileURL(resolveFile(url.pathname)).toString());
    });

    createWindow();

    electronApp.on('activate', () => {
      if (!BrowserWindow.getAllWindows().length) createWindow();
    });
  });

  electronApp.on('window-all-closed', () => {
    if (process.platform !== 'darwin') electronApp.quit();
  });
}