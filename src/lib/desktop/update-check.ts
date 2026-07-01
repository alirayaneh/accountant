'use client';

import { useCallback, useEffect, useState } from 'react';
import { getRemoteApiURL } from '@/lib/api-url';
import { getDesktopLicenseHeader } from '@/lib/desktop/desktop-auth';
import type { DesktopUpdateCheckResponse } from '@/lib/types';

const CACHE_KEY = 'desktop:update:cache';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

type UpdateCache = {
  checkedAt: string;
  data: DesktopUpdateCheckResponse;
};

export function getCachedUpdateCheck(): DesktopUpdateCheckResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as UpdateCache;
    return entry.data;
  } catch {
    return null;
  }
}

export async function checkForUpdate(
  currentVersion: string,
  platform: 'linux' | 'win'
): Promise<DesktopUpdateCheckResponse | null> {
  try {
    const headers = await getDesktopLicenseHeader();
    const params = new URLSearchParams({
      current_version: currentVersion,
      platform,
    });
    const res = await fetch(
      `${getRemoteApiURL()}/api/desktop/updates/check?${params}`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as DesktopUpdateCheckResponse;
    const entry: UpdateCache = {
      checkedAt: new Date().toISOString(),
      data,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    return data;
  } catch {
    return null;
  }
}

function detectPlatform(): 'linux' | 'win' {
  if (typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent)) {
    return 'win';
  }
  return 'linux';
}

export function useDesktopUpdateCheck(isOnline: boolean, appVersion: string | null) {
  const [updateInfo, setUpdateInfo] = useState<DesktopUpdateCheckResponse | null>(null);

  const runCheck = useCallback(async () => {
    if (!appVersion) return;

    const cached = getCachedUpdateCheck();
    if (cached) {
      setUpdateInfo(cached);
    }

    if (!isOnline) return;

    const fresh = await checkForUpdate(appVersion, detectPlatform());
    if (fresh) {
      setUpdateInfo(fresh);
    }
  }, [isOnline, appVersion]);

  useEffect(() => {
    runCheck();
    const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runCheck]);

  return {
    updateInfo,
    updateAvailable: Boolean(updateInfo?.updateAvailable),
  };
}
