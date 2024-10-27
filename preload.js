// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getAllowedDomains: () => ipcRenderer.invoke('get-allowed-domains')
})
