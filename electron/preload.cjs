const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getOfflineStorageInfo: () => ipcRenderer.invoke('offline-storage:get-info'),
  selectOfflineStorageFolder: () => ipcRenderer.invoke('offline-storage:select-folder'),
  applyOfflineStorageFolder: (folderPath) => ipcRenderer.invoke('offline-storage:apply-folder', folderPath),
  restoreOfflineDatabase: () => ipcRenderer.invoke('offline-storage:restore'),
  setStorageType: (storageType) => ipcRenderer.invoke('offline-storage:set-storage-type', storageType),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
});
