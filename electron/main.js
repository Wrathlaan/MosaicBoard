const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.ELECTRON_DEV === '1';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    // Load from Vite dev server
    win.loadURL('http://localhost:5173');
    // Open DevTools
    win.webContents.openDevTools();
  } else {
    // Load the built index.html
    win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }
}

// IPC Handlers for Desktop-specific features
ipcMain.on('set-start-on-login', (event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled });
});

ipcMain.handle('get-start-on-login', async () => {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
});


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});