
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { APIDataProvider } from '@/lib/db-api';
import { getLocalApiURL, getRemoteApiURL } from '@/lib/api-url';
import type { DataProvider } from '@/lib/dataprovider';
import type { UserProfile, AppSettings } from '@/lib/types';
import type { StorageType } from '@/lib/storage-types';
import {
  IS_STORAGE_LOCKED,
  LOCKED_STORAGE_TYPE,
  IS_STORAGE_CONFIGURABLE,
  IS_ELECTRON_BUILD,
} from '@/lib/build-config';
import { setElectronStorageType } from '@/lib/electron-offline-storage';

export type { StorageType } from '@/lib/storage-types';

const normalizeStorageType = (value: string | null): StorageType => {
  if (value === 'online') return 'online';
  return 'sqlite';
};

const getApiURL = (storageType: StorageType) => (
  storageType === 'online' ? getRemoteApiURL() : getLocalApiURL()
);

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

  useEffect(() => {
    let savedProvider: StorageType;
    if (IS_STORAGE_LOCKED && LOCKED_STORAGE_TYPE) {
      savedProvider = LOCKED_STORAGE_TYPE;
      localStorage.setItem('storageType', savedProvider);
    } else {
      savedProvider = normalizeStorageType(localStorage.getItem('storageType'));
      if (!IS_STORAGE_CONFIGURABLE || localStorage.getItem('storageType') !== savedProvider) {
        localStorage.setItem('storageType', savedProvider);
      }
    }
    setStorageType(savedProvider);

    const apiToken = localStorage.getItem('apiToken');
    if (!apiToken) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    fetch(`${getApiURL(savedProvider)}/api/auth/me`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('API auth failed');
        return response.json();
      })
      .then((profile: UserProfile) => setUser(profile))
      .catch(() => {
        localStorage.removeItem('apiToken');
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    async function initializeProvider() {
      if (authLoading) return;

      setIsLoading(true);

      const apiToken = localStorage.getItem('apiToken');
      if (!apiToken) {
        setIsLoading(false);
        return;
      }

      const provider = APIDataProvider(getApiURL(storageType), () => localStorage.getItem('apiToken'));

      try {
        const appSettings = await provider.getAppSettings();
        setSettings(appSettings);
      } catch (e) {
        console.error('Failed to fetch app settings:', e);
        localStorage.removeItem('apiToken');
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return;
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
    localStorage.setItem('storageType', newType);
    setStorageType(newType);
    if (IS_ELECTRON_BUILD) {
      void setElectronStorageType(newType);
    }
  }, []);

  const stopImpersonation = useCallback(async () => {
    const apiToken = localStorage.getItem('apiToken');
    if (!apiToken) return;

    const provider = APIDataProvider(getApiURL(storageType), () => localStorage.getItem('apiToken'));
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
    settings,
    setSettings,
    isImpersonating: Boolean(user?.impersonating),
    stopImpersonation,
  }), [dataProvider, isLoading, isGlobalLoading, storageType, changeStorageType, user, authLoading, settings, stopImpersonation]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
