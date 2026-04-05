const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer (React app)
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  onMaximized: (callback) => ipcRenderer.on('window-maximized', (_, isMax) => callback(isMax)),
  onReady: (callback) => ipcRenderer.on('window-ready', callback),

  // Native print
  print: (html, title) => ipcRenderer.send('print-content', { html, title }),

  // Tray badge
  updateBadge: (count) => ipcRenderer.send('update-tray-badge', count),

  // Open external URL
  openExternal: (url) => ipcRenderer.send('open-external', url),
});
