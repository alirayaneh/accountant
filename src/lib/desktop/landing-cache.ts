'use client';

import { useCallback, useEffect, useState } from 'react';
import { getRemoteApiURL } from '@/lib/api-url';
import type { LandingContent } from '@/lib/types';

const CACHE_KEY = 'desktop:landing:cache';

type LandingCacheEntry = {
  fetchedAt: string;
  content: LandingContent;
};

export function getCachedLanding(): LandingContent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as LandingCacheEntry;
    return entry.content ?? null;
  } catch {
    return null;
  }
}

export async function fetchAndCacheLanding(): Promise<LandingContent | null> {
  const res = await fetch(`${getRemoteApiURL()}/api/landing`);
  if (!res.ok) return null;
  const content = (await res.json()) as LandingContent;
  const entry: LandingCacheEntry = {
    fetchedAt: new Date().toISOString(),
    content,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  return content;
}

export function useLandingContent() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const cached = getCachedLanding();
    if (cached) {
      setContent(cached);
      setIsFromCache(true);
      setIsLoading(false);
    }

    if (!navigator.onLine) {
      if (!cached) {
        setError('offline_no_cache');
      }
      setIsLoading(false);
      return;
    }

    try {
      const fresh = await fetchAndCacheLanding();
      if (fresh) {
        setContent(fresh);
        setIsFromCache(false);
        setError(null);
      } else if (!cached) {
        setError('fetch_failed');
      }
    } catch {
      if (!cached) {
        setError('fetch_failed');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const handleOnline = () => {
      refresh();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refresh]);

  return { content, isLoading, isFromCache, error, refresh };
}
