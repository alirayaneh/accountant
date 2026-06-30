import { assertLicenseValid } from '../engine';

export async function ensureHomeEntitlement(): Promise<void> {
  await assertLicenseValid();
}
