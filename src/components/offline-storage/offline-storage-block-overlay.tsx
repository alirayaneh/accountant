'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { FolderOpen, Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/app-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import {
  applyOfflineStorageFolder,
  getOfflineStorageInfo,
  isElectronOfflineStorageAvailable,
  selectOfflineStorageFolder,
} from '@/lib/electron-offline-storage';
import type { OfflineStorageInfo } from '@/types/electron';
import { useToast } from '@/hooks/use-toast';

export function OfflineStorageBlockOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { storageType } = useAppContext();
  const { toast } = useToast();
  const [info, setInfo] = useState<OfflineStorageInfo | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const loadInfo = useCallback(async () => {
    if (!IS_ELECTRON_BUILD || !isElectronOfflineStorageAvailable() || storageType !== 'sqlite') {
      setInfo(null);
      return;
    }

    try {
      const nextInfo = await getOfflineStorageInfo();
      setInfo(nextInfo);
    } catch (error) {
      console.error('Failed to load offline storage info:', error);
    }
  }, [storageType]);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  const isStorageSettingsPage = pathname?.startsWith('/dashboard/settings')
    && searchParams.get('tab') === 'data-storage';

  const shouldBlock = IS_ELECTRON_BUILD
    && storageType === 'sqlite'
    && isElectronOfflineStorageAvailable()
    && info?.requiresCustomDataDir;

  if (!shouldBlock || isStorageSettingsPage) {
    return null;
  }

  const handleSelectFolder = async () => {
    try {
      const folderPath = await selectOfflineStorageFolder();
      if (!folderPath) {
        return;
      }

      setIsApplying(true);
      await applyOfflineStorageFolder(folderPath);
      toast({
        title: 'محل ذخیره‌سازی آفلاین تنظیم شد',
        description: 'اکنون می‌توانید از برنامه استفاده کنید.',
      });
      await loadInfo();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'انتخاب پوشه ناموفق بود',
        description: error instanceof Error ? error.message : 'پوشه ذخیره‌سازی تنظیم نشد.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>انتخاب محل ذخیره‌سازی آفلاین الزامی است</CardTitle>
          <CardDescription>
            برای حالت آفلاین، باید پوشه‌ای خارج از محل نصب برنامه انتخاب کنید تا دیتابیس و فایل‌های آپلود شما با به‌روزرسانی نسخه جدید از بین نرود.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {info?.configuredButForbidden && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              محل ذخیره‌سازی فعلی داخل پوشه نصب برنامه است و مجاز نیست. لطفاً پوشه جدیدی انتخاب کنید.
            </p>
          )}
          <Button className="w-full" onClick={handleSelectFolder} disabled={isApplying}>
            {isApplying
              ? <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              : <FolderOpen className="ms-2 h-4 w-4" />}
            انتخاب محل دلخواه
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/settings?tab=data-storage">رفتن به تنظیمات ذخیره‌سازی</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
