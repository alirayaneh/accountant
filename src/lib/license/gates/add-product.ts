import { assertLicenseValid } from '../engine';

export async function checkCatalogWriteAccess(): Promise<void> {
  await assertLicenseValid();
}
