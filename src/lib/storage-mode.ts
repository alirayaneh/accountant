import { getLocalApiURL, getRemoteApiURL } from '@/lib/api-url';
import type { StorageType } from '@/lib/storage-types';

export function getStorageApiURL(storageType: StorageType): string {
  return storageType === 'online' ? getRemoteApiURL() : getLocalApiURL();
}

export async function testStorageHealth(
  storageType: StorageType,
  timeoutMs = 8000,
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getStorageApiURL(storageType)}/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('پاسخ API نامعتبر بود.');
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
}
