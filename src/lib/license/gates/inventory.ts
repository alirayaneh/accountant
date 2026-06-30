import { assertLicenseValid } from '../engine';

export async function verifyWarehouseModule(): Promise<void> {
  await assertLicenseValid();
}
