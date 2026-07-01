'use client';

import { useEffect, useState } from 'react';
import { useAppContext } from '@/components/app-provider';
import { IS_ELECTRON_BUILD, ALLOWED_STORAGE_TYPES } from '@/lib/build-config';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useDesktopNotifications } from '@/lib/desktop/notifications';
import { useDesktopUpdateCheck } from '@/lib/desktop/update-check';
import { useToast } from '@/hooks/use-toast';
import { testStorageHealth } from '@/lib/storage-mode';
import type { StorageType } from '@/lib/storage-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Bell,
  Cloud,
  Download,
  HardDrive,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function getNetworkLabel(status: ReturnType<typeof useNetworkStatus>['status']) {
  switch (status) {
    case 'online':
      return 'آنلاین';
    case 'server_unreachable':
      return 'متصل — سرور در دسترس نیست';
    default:
      return 'آفلاین';
  }
}

function getNetworkColor(status: ReturnType<typeof useNetworkStatus>['status']) {
  switch (status) {
    case 'online':
      return 'text-success';
    case 'server_unreachable':
      return 'text-amber-500';
    default:
      return 'text-destructive';
  }
}

export function DesktopStatusBar({
  className,
  showStorageSwitch = false,
}: {
  className?: string;
  showStorageSwitch?: boolean;
}) {
  const { storageType, changeStorageType, isStorageConfigurable } = useAppContext();
  const { status, isOnline } = useNetworkStatus(storageType);
  const { toast } = useToast();
  const { data: notifications, markAllRead, markRead } = useDesktopNotifications(isOnline);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const { updateInfo, updateAvailable } = useDesktopUpdateCheck(isOnline, appVersion);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [storagePopoverOpen, setStoragePopoverOpen] = useState(false);
  const [isSwitchingStorage, setIsSwitchingStorage] = useState(false);

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return;
    window.electronAPI?.getAppVersion?.().then(setAppVersion).catch(() => {
      setAppVersion('0.1.0');
    });
  }, []);

  if (!IS_ELECTRON_BUILD) return null;

  const unreadCount = notifications?.unreadCount ?? 0;
  const storageLabel = storageType === 'online' ? 'ذخیره‌سازی آنلاین' : 'ذخیره‌سازی آفلاین محلی';
  const StorageIcon = storageType === 'online' ? Cloud : HardDrive;
  const NetworkIcon = status === 'offline' ? WifiOff : Wifi;

  const handleDownload = () => {
    if (updateInfo?.downloadUrl) {
      window.electronAPI?.openExternal?.(updateInfo.downloadUrl);
    }
  };

  const canSwitchStorage = showStorageSwitch
    && isStorageConfigurable
    && ALLOWED_STORAGE_TYPES.includes('sqlite')
    && ALLOWED_STORAGE_TYPES.includes('online');

  const handleStorageModeChange = async (checked: boolean) => {
    const nextType: StorageType = checked ? 'online' : 'sqlite';
    if (nextType === storageType || isSwitchingStorage) {
      return;
    }

    setIsSwitchingStorage(true);
    try {
      await testStorageHealth(nextType);
      changeStorageType(nextType);
      toast({
        title: 'محل ذخیره‌سازی تغییر کرد',
        description: nextType === 'online'
          ? 'از این پس به سرور آنلاین متصل می‌شوید.'
          : 'از این پس داده‌ها به‌صورت محلی ذخیره می‌شوند.',
      });
      setStoragePopoverOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'تغییر محل ذخیره‌سازی ناموفق بود',
        description: error instanceof Error ? error.message : 'اتصال به محل ذخیره‌سازی برقرار نشد.',
      });
    } finally {
      setIsSwitchingStorage(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-card/40 px-1.5 py-1 backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <NetworkIcon className={cn('h-3.5 w-3.5', getNetworkColor(status))} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{getNetworkLabel(status)}</p>
            </TooltipContent>
          </Tooltip>

          {canSwitchStorage ? (
            <Popover open={storagePopoverOpen} onOpenChange={setStoragePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title={storageLabel}>
                  <StorageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">محل ذخیره‌سازی</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      بین نسخه آفلاین محلی و سرور آنلاین جابه‌جا شوید.
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-muted/20 px-3 py-2.5">
                    <div className="space-y-0.5">
                      <Label htmlFor="desktop-storage-switch" className="text-sm">
                        {storageType === 'online' ? 'آنلاین (سرور)' : 'آفلاین (محلی)'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {storageType === 'online'
                          ? 'داده‌ها روی سرور ذخیره می‌شوند'
                          : 'داده‌ها روی دستگاه شما ذخیره می‌شوند'}
                      </p>
                    </div>
                    <Switch
                      id="desktop-storage-switch"
                      checked={storageType === 'online'}
                      disabled={isSwitchingStorage}
                      onCheckedChange={handleStorageModeChange}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    با تغییر حالت، نشست فعلی پاک می‌شود و باید دوباره وارد شوید.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <StorageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{storageLabel}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-7 w-7">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>اعلان‌ها</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="text-sm font-medium">اعلان‌ها</span>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                    همه خوانده شد
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-72">
                {!notifications?.notifications.length ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    اعلانی وجود ندارد
                  </p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {notifications.notifications.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cn(
                            'w-full px-3 py-2.5 text-right transition-colors hover:bg-muted/40',
                            !item.isRead && 'bg-primary/5'
                          )}
                          onClick={() => markRead(item.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium">{item.title}</span>
                            {item.severity === 'critical' && (
                              <Badge variant="destructive" className="text-[10px]">مهم</Badge>
                            )}
                            {item.severity === 'warning' && (
                              <Badge variant="secondary" className="text-[10px]">هشدار</Badge>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.body}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {appVersion && (
          <button
            type="button"
            onClick={() => updateAvailable && setUpdateDialogOpen(true)}
            className={cn(
              'flex items-center gap-1 rounded-full border border-white/10 bg-card/40 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm transition-colors',
              updateAvailable && 'cursor-pointer hover:border-amber-500/40 hover:text-foreground'
            )}
          >
            <span>v{appVersion}</span>
            {updateAvailable && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
          </button>
        )}
      </div>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>به‌روزرسانی موجود است</DialogTitle>
            <DialogDescription>
              نسخه جدید نرم‌افزار در دسترس است. پوشه داده شما حفظ می‌شود؛ فقط فایل اجرایی را جایگزین کنید.
            </DialogDescription>
          </DialogHeader>
          {updateInfo && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>نسخه فعلی</span>
                <span>{updateInfo.currentVersion}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>نسخه جدید</span>
                <span>{updateInfo.latestVersion}</span>
              </div>
              {updateInfo.releaseNotes && (
                <div className="rounded-lg border border-white/10 bg-muted/20 p-3 whitespace-pre-wrap text-muted-foreground">
                  {updateInfo.releaseNotes}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              بعداً
            </Button>
            {updateInfo?.downloadUrl && (
              <Button variant="gradient" onClick={handleDownload}>
                <Download className="ms-1 h-4 w-4" />
                دانلود نسخه جدید
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
