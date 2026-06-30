import type { StorageType } from '@/lib/storage-types';

const VALID_STORAGE_TYPES: StorageType[] = ['sqlite', 'online'];

function parseAllowedStorageTypes(): StorageType[] {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_STORAGE_TYPES || 'sqlite,online';
  const parsed = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is StorageType => VALID_STORAGE_TYPES.includes(value as StorageType));

  return parsed.length > 0 ? parsed : ['sqlite', 'online'];
}

export const ALLOWED_STORAGE_TYPES = parseAllowedStorageTypes();
export const IS_STORAGE_LOCKED = ALLOWED_STORAGE_TYPES.length === 1;
export const LOCKED_STORAGE_TYPE: StorageType | null = IS_STORAGE_LOCKED
  ? ALLOWED_STORAGE_TYPES[0]
  : null;
export const IS_ELECTRON_BUILD = process.env.NEXT_PUBLIC_IS_ELECTRON === 'true';
export const IS_SERVER_BUILD = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'server';
export const IS_STORAGE_CONFIGURABLE = !IS_STORAGE_LOCKED;
