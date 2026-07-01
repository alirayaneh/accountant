
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { APIDataProvider } from '@/lib/db-api';
import type { DataProvider } from '@/lib/dataprovider';
import type { UserProfile, AppSettings } from '@/lib/types';
import type { StorageType } from '@/lib/storage-types';
import {
  IS_STORAGE_LOCKED,
  LOCKED_STORAGE_TYPE,
  IS_STORAGE_CONFIGURABLE,
  IS_ELECTRON_BUILD,
} from '@/lib/build-config';
import { getOfflineStorageInfo, setElectronStorageType } from '@/lib/electron-offline-storage';
import { getStorageApiURL } from '@/lib/storage-mode';

export type { StorageType } from '@/lib/storage-types';

const normalizeStorageType = (value: string | null): StorageType => {
  if (value === 'online') return 'online';
  return 'sqlite';
};

interface AppContextValue {
  db: DataProvider | null;
  isLoading: boolean;
  isGlobalLoading: boolean;
  setGlobalLoading: (isLoading: boolean) => void;
  storageType: StorageType;
  changeStorageType: (newType: StorageType) => void;
  isStorageConfigurable: boolean;
  user: UserProfile | null | undefined;
  authLoading: boolean;
  completeLogin: (token: string, profile: UserProfile) => void;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  isImpersonating: boolean;
  stopImpersonation: () => Promise<void>;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [storageType, setStorageType] = useState<StorageType>('sqlite');
  const [dataProvider, setDataProvider] = useState<DataProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGlobalLoading, setGlobalLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({ shopName: 'حسابدار آنلاین آموزا' });

  const restoreSession = useCallback(async (provider: StorageType) => {
    const apiToken = localStorage.getItem('apiToken');
    if (!apiToken) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch(`${getStorageApiURL(provider)}/api/auth/me`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!response.ok) {
        throw new Error('API auth failed');
      }
      const profile = await response.json() as UserProfile;
      setUser(profile);
    } catch {
      localStorage.removeItem('apiToken');
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      let savedProvider: StorageType;

      if (IS_STORAGE_LOCKED && LOCKED_STORAGE_TYPE) {
        savedProvider = LOCKED_STORAGE_TYPE;
        localStorage.setItem('storageType', savedProvider);
      } else if (IS_ELECTRON_BUILD && IS_STORAGE_CONFIGURABLE) {
        try {
          const info = await getOfflineStorageInfo();
          const electronType = info?.config?.storageType;
          if (electronType === 'online' || electronType === 'sqlite') {
            savedProvider = electronType;
          } else {
            savedProvider = normalizeStorageType(localStorage.getItem('storageType'));
          }
        } catch {
          savedProvider = normalizeStorageType(localStorage.getItem('storageType'));
        }
        localStorage.setItem('storageType', savedProvider);
      } else {
        savedProvider = normalizeStorageType(localStorage.getItem('storageType'));
        if (!IS_STORAGE_CONFIGURABLE || localStorage.getItem('storageType') !== savedProvider) {
          localStorage.setItem('storageType', savedProvider);
        }
      }

      if (cancelled) {
        return;
      }

      setStorageType(savedProvider);
      await restoreSession(savedProvider);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [restoreSession]);

  useEffect(() => {
    async function initializeProvider() {
      if (authLoading) return;

      setIsLoading(true);

      const apiToken = localStorage.getItem('apiToken');
      if (!apiToken) {
        setIsLoading(false);
        return;
      }

      const provider = APIDataProvider(getStorageApiURL(storageType), () => localStorage.getItem('apiToken'));

      try {
        const appSettings = await provider.getAppSettings();
        setSettings(appSettings);
      } catch (e) {
        console.error('Failed to fetch app settings:', e);
        setSettings({ shopName: 'حسابدار آنلاین آموزا' });
      }

      try {
        await provider.applyRecurringExpenses();
      } catch (e) {
        console.error('Failed to apply recurring expenses on startup:', e);
      }

      setDataProvider(provider);
      setIsLoading(false);
    }

    initializeProvider();
  }, [storageType, user, authLoading]);

  const changeStorageType = useCallback((newType: StorageType) => {
    if (!IS_STORAGE_CONFIGURABLE) return;

    const previousType = normalizeStorageType(localStorage.getItem('storageType'));
    if (previousType !== newType) {
      localStorage.removeItem('apiToken');
      localStorage.removeItem('originalAdminToken');
      setUser(null);
      setDataProvider(null);
    }

    localStorage.setItem('storageType', newType);
    setStorageType(newType);
    if (IS_ELECTRON_BUILD) {
      void setElectronStorageType(newType);
    }
  }, []);

  const completeLogin = useCallback((token: string, profile: UserProfile) => {
    localStorage.setItem('apiToken', token);
    setUser(profile);
    setAuthLoading(false);
  }, []);

  const stopImpersonation = useCallback(async () => {
    const apiToken = localStorage.getItem('apiToken');
    if (!apiToken) return;

    const provider = APIDataProvider(getStorageApiURL(storageType), () => localStorage.getItem('apiToken'));
    const result = await provider.stopImpersonation();
    localStorage.setItem('apiToken', result.token);
    localStorage.removeItem('originalAdminToken');
    setUser(result.user);
    window.location.href = '/dashboard/admin/users';
  }, [storageType]);

  const contextValue = useMemo(() => ({
    db: dataProvider,
    isLoading,
    isGlobalLoading,
    setGlobalLoading,
    storageType,
    changeStorageType,
    isStorageConfigurable: IS_STORAGE_CONFIGURABLE,
    user,
    authLoading,
    completeLogin,
    settings,
    setSettings,
    isImpersonating: Boolean(user?.impersonating),
    stopImpersonation,
  }), [dataProvider, isLoading, isGlobalLoading, storageType, changeStorageType, user, authLoading, completeLogin, settings, stopImpersonation]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
