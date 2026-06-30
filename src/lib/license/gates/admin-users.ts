import { assertLicenseValid } from '../engine';

export async function verifyAdminPanelAccess(): Promise<void> {
  await assertLicenseValid();
}
