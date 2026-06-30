import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { getLocalApiURL } from '@/lib/api-url';
import type { LicenseStatusResponse } from './types';

type LicenseBlockListener = (status: LicenseStatusResponse) => void;

const listeners = new Set<LicenseBlockListener>();
let cachedStatus: LicenseStatusResponse | null = null;

export function onLicenseBlocked(listener: LicenseBlockListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyBlocked(status: LicenseStatusResponse) {
  cachedStatus = status;
  for (const listener of listeners) {
    listener(status);
  }
}

export async function fetchLicenseStatus(): Promise<LicenseStatusResponse> {
  if (!IS_ELECTRON_BUILD) {
    return { valid: true, status: 'active' };
  }

  const response = await fetch(`${getLocalApiURL()}/api/license/status`);
  if (!response.ok) {
    const status: LicenseStatusResponse = {
      valid: false,
      status: 'inactive',
      reason: 'STATUS_UNAVAILABLE',
      message: 'وضعیت لایسنس در دسترس نیست',
    };
    notifyBlocked(status);
    return status;
  }

  const data = (await response.json()) as LicenseStatusResponse;
  cachedStatus = data;
  if (!data.valid) {
    notifyBlocked(data);
  }
  return data;
}

export async function assertLicenseValid(): Promise<void> {
  if (!IS_ELECTRON_BUILD) return;

  const status = await fetchLicenseStatus();
  if (!status.valid) {
    throw new Error(status.message || 'License invalid');
  }
}

export function getCachedLicenseStatus(): LicenseStatusResponse | null {
  return cachedStatus;
}
