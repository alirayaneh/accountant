import { assertLicenseValid } from '../engine';

export async function ensureExpenseTracking(): Promise<void> {
  await assertLicenseValid();
}
