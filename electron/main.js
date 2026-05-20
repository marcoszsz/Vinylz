const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const APP_URL = 'https://vinylsz.vercel.app/home.html';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 390,
    minHeight: 680,
    title: 'Vinyl',
    backgroundColor: '#0b0b0d',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadURL(APP_URL);

  win.webContents.setWindowOpenHandler(({ url }) => {
    const isVinyl = url.startsWith('https://vinylsz.vercel.app');

    if (isVinyl) {
      return { action: 'allow' };
    }

    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
