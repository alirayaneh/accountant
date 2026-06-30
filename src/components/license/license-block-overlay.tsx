'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { onLicenseBlocked, getCachedLicenseStatus } from '@/lib/license/engine';
import type { LicenseStatusResponse } from '@/lib/license/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';

export function LicenseBlockOverlay() {
  const pathname = usePathname();
  const [blocked, setBlocked] = useState<LicenseStatusResponse | null>(
    IS_ELECTRON_BUILD ? getCachedLicenseStatus() : null
  );

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return undefined;

    return onLicenseBlocked((status) => {
      if (!status.valid) {
        setBlocked(status);
      }
    });
  }, []);

  const isSettingsPage = pathname?.startsWith('/dashboard/settings');

  if (!IS_ELECTRON_BUILD || isSettingsPage || !blocked || blocked.valid) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>لایسنس مورد نیاز است</CardTitle>
          <CardDescription>
            {blocked.message || 'برای استفاده از این بخش، لایسنس معتبر لازم است.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/dashboard/settings?tab=license">رفتن به تنظیمات لایسنس</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
