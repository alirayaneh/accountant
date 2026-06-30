import { assertLicenseValid } from '../engine';

export async function verifyPaymentModule(): Promise<void> {
  await assertLicenseValid();
}
