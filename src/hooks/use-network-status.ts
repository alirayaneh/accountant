'use client';

import { useEffect, useState } from 'react';
import { getStorageApiURL } from '@/lib/storage-mode';
import type { StorageType } from '@/lib/storage-types';

export type NetworkStatus = 'online' | 'server_unreachable' | 'offline';

export function useNetworkStatus(storageType: StorageType = 'sqlite') {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => {
      setBrowserOnline(false);
      setServerReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!browserOnline) {
      setServerReachable(false);
      return;
    }

    let cancelled = false;

    async function ping() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${getStorageApiURL(storageType)}/health`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeout);
        if (!cancelled) {
          setServerReachable(res.ok);
        }
      } catch {
        if (!cancelled) {
          setServerReachable(false);
        }
      }
    }

    ping();
    const interval = setInterval(ping, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [browserOnline, storageType]);

  let status: NetworkStatus = 'offline';
  if (browserOnline && serverReachable === true) {
    status = 'online';
  } else if (browserOnline && serverReachable === false) {
    status = 'server_unreachable';
  }

  const isOnline = status === 'online';

  return { status, isOnline, browserOnline, serverReachable };
}
