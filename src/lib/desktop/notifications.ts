'use client';

import { useCallback, useEffect, useState } from 'react';
import { getRemoteApiURL } from '@/lib/api-url';
import { getDesktopLicenseHeader } from '@/lib/desktop/desktop-auth';
import type { DesktopNotification, DesktopNotificationsResponse } from '@/lib/types';

const CACHE_KEY = 'desktop:notifications:cache';
const READ_KEY = 'desktop:notifications:read';

type NotificationsCache = {
  fetchedAt: string;
  data: DesktopNotificationsResponse;
};

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markReadLocally(ids: string[]) {
  const read = getReadIds();
  ids.forEach((id) => read.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify([...read]));
}

function applyReadState(data: DesktopNotificationsResponse): DesktopNotificationsResponse {
  const readIds = getReadIds();
  const notifications = data.notifications.map((n) => ({
    ...n,
    isRead: readIds.has(n.id) || n.isRead,
  }));
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return { notifications, unreadCount };
}

export function getCachedNotifications(): DesktopNotificationsResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as NotificationsCache;
    return applyReadState(entry.data);
  } catch {
    return null;
  }
}

export async function fetchNotifications(limit = 20): Promise<DesktopNotificationsResponse | null> {
  try {
    const headers = await getDesktopLicenseHeader();
    const res = await fetch(`${getRemoteApiURL()}/api/desktop/notifications?limit=${limit}`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DesktopNotificationsResponse;
    const withRead = applyReadState(data);
    const entry: NotificationsCache = {
      fetchedAt: new Date().toISOString(),
      data: withRead,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    return withRead;
  } catch {
    return null;
  }
}

export function useDesktopNotifications(isOnline: boolean) {
  const [data, setData] = useState<DesktopNotificationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const cached = getCachedNotifications();
    if (cached) {
      setData(cached);
      setIsLoading(false);
    }

    if (!isOnline) {
      setIsLoading(false);
      return;
    }

    try {
      const fresh = await fetchNotifications();
      if (fresh) {
        setData(fresh);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAllRead = useCallback(() => {
    if (!data) return;
    const ids = data.notifications.filter((n) => !n.isRead).map((n) => n.id);
    markReadLocally(ids);
    setData({
      notifications: data.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    });
  }, [data]);

  const markRead = useCallback((id: string) => {
    markReadLocally([id]);
    setData((prev) => {
      if (!prev) return prev;
      const notifications = prev.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ) as DesktopNotification[];
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.isRead).length,
      };
    });
  }, []);

  return { data, isLoading, refresh, markAllRead, markRead };
}
