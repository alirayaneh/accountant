import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import type { OfflineStorageInfo } from '@/types/electron';

function getElectronAPI() {
  if (!IS_ELECTRON_BUILD || typeof window === 'undefined') {
    return null;
  }
  return window.electronAPI ?? null;
}

export function isElectronOfflineStorageAvailable(): boolean {
  return Boolean(getElectronAPI());
}

export async function getOfflineStorageInfo(): Promise<OfflineStorageInfo | null> {
  const api = getElectronAPI();
  if (!api) {
    return null;
  }
  return api.getOfflineStorageInfo();
}

export async function selectOfflineStorageFolder(): Promise<string | null> {
  const api = getElectronAPI();
  if (!api) {
    return null;
  }
  return api.selectOfflineStorageFolder();
}

export async function applyOfflineStorageFolder(folderPath: string) {
  const api = getElectronAPI();
  if (!api) {
    throw new Error('Electron offline storage is not available.');
  }
  return api.applyOfflineStorageFolder(folderPath);
}

export async function restoreOfflineDatabase(): Promise<OfflineStorageInfo | null> {
  const api = getElectronAPI();
  if (!api) {
    return null;
  }
  return api.restoreOfflineDatabase();
}

export async function setElectronStorageType(storageType: 'sqlite' | 'online') {
  const api = getElectronAPI();
  if (!api) {
    return null;
  }
  return api.setStorageType(storageType);
}
