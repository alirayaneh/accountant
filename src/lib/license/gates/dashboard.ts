import { assertLicenseValid } from '../engine';

export async function _ensureModuleface20(): Promise<void> {
  await assertLicenseValid();
}
