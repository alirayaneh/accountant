import { assertLicenseValid } from '../engine';

export async function ensurePosLicense(): Promise<void> {
  await assertLicenseValid();
}
