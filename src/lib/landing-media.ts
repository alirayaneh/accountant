import { getRemoteApiURL } from '@/lib/api-url';

export function resolveLandingMediaUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const base = getRemoteApiURL().replace(/\/$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

export function toUploadPath(url: string): string {
  if (!url) return url;
  try {
    const base = getRemoteApiURL().replace(/\/$/, '');
    if (url.startsWith(base)) {
      return url.slice(base.length);
    }
  } catch {
    // keep as-is
  }
  return url;
}
