import { assertLicenseValid } from '../engine';

export async function validateItemViewRights(): Promise<void> {
  await assertLicenseValid();
}
