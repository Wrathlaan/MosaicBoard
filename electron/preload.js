const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  setStartOnLogin: (enabled) => ipcRenderer.send('set-start-on-login', enabled),
  getStartOnLogin: () => ipcRenderer.invoke('get-start-on-login'),
  IS_DESKTOP: true,
});