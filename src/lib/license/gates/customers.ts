import { assertLicenseValid } from '../engine';

export async function validateCrmAccess(): Promise<void> {
  await assertLicenseValid();
}
