import { getLocalApiURL } from '@/lib/api-url';

let cachedCredentials: string | null = null;
let cacheExpiresAt = 0;

const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getDesktopLicenseHeader(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCredentials && now < cacheExpiresAt) {
    return { 'X-Desktop-License': cachedCredentials };
  }

  const res = await fetch(`${getLocalApiURL()}/api/license/desktop-credentials`);
  if (!res.ok) {
    throw new Error('License credentials unavailable');
  }

  const data = (await res.json()) as { credentials: string };
  cachedCredentials = data.credentials;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return { 'X-Desktop-License': cachedCredentials };
}

export function clearDesktopLicenseCache() {
  cachedCredentials = null;
  cacheExpiresAt = 0;
}
