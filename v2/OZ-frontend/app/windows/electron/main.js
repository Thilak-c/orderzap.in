const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false, // Custom titlebar
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    // Uncomment below for devtools:
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Emit ready event to renderer when window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('window-ready');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false);
  });
}

function createTray() {
  // Create a simple tray icon (16x16 empty buffer as placeholder)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('OrderZap');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open OrderZap',
      click: () => {
        if (mainWindow) mainWindow.show();
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// IPC Handlers — Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// IPC Handlers — Native Print
ipcMain.on('print-content', (event, { html, title }) => {
  const printWin = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  printWin.webContents.on('did-finish-load', () => {
    printWin.webContents.print({ silent: false, printBackground: true }, () => {
      printWin.close();
    });
  });
});

// IPC Handlers — Tray badge update
ipcMain.on('update-tray-badge', (event, count) => {
  if (tray) {
    tray.setToolTip(`OrderZap${count > 0 ? ` (${count} pending)` : ''}`);
  }
  if (process.platform === 'darwin' && app.setBadgeCount) {
    app.setBadgeCount(count);
  }
});

// IPC Handlers — Open external URL
ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

// Native menu
const menuTemplate = [
  {
    label: 'View',
    submenu: [
      { role: 'reload', label: 'Reload' },
      { role: 'forceReload' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Full Screen' },
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'OrderZap v2.0',
        click: () => shell.openExternal('https://orderzap.in')
      }
    ]
  }
];

app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  createWindow();
  // createTray(); // Enable if you want system tray
});

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
