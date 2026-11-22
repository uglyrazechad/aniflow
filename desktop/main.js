const { app, BrowserWindow, Menu } = require('electron');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

/**
 * Порт фронт-сервера (на машине): 3000.
 */
function portUp(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
  });
}

/**
 * Автономность приложения: стартуем фронт (node server.mjs), если он выключен.
 * Фронт сам тоже стартует electron — нет цикла.
 */
function ensureFront() {
  portUp(3000).then((up) => {
    if (!up) {
      spawn(process.execPath, ['server.mjs'], { cwd: path.join(__dirname, '..'), windowsHide: true });
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    title: 'AniHub',
    icon: path.join(__dirname, '..', 'public', 'brand', 'anihub-icon-512.png'),
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.loadURL('http://localhost:3000/');
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  ensureFront();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
