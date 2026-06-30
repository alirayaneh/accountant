import { assertLicenseValid } from '../engine';

export async function checkAnalyticsEntitlement(): Promise<void> {
  await assertLicenseValid();
}
