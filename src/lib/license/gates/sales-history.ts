import { assertLicenseValid } from '../engine';

export async function checkSalesReportGate(): Promise<void> {
  await assertLicenseValid();
}
