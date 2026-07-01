export interface OfflineStorageInfo {
  ok: boolean;
  missingDb: boolean;
  activeDir: string;
  dbPath: string;
  uploadDir: string;
  hasBackup: boolean;
  isCustomPath: boolean;
  isValidCustomPath: boolean;
  requiresCustomDataDir: boolean;
  configuredButForbidden?: boolean;
  storageType?: 'sqlite' | 'online';
  defaultDataDir: string;
  config?: {
    dataDir: string | null;
    storageType?: 'sqlite' | 'online';
  };
}

export interface ElectronAPI {
  getOfflineStorageInfo: () => Promise<OfflineStorageInfo>;
  selectOfflineStorageFolder: () => Promise<string | null>;
  applyOfflineStorageFolder: (folderPath: string) => Promise<{
    activeDir: string;
    dbPath: string;
    uploadDir: string;
  }>;
  restoreOfflineDatabase: () => Promise<OfflineStorageInfo>;
  setStorageType: (storageType: 'sqlite' | 'online') => Promise<OfflineStorageInfo>;
  getAppVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
