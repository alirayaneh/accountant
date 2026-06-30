'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/components/app-provider';
import { Badge } from '@/components/ui/badge';

export function ServerDesktopLicenseForm() {
  const { db } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<Record<string, unknown> | null>(null);

  const loadLicense = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const data = await db.getMyDesktopLicense();
      setLicenseInfo(data);
      if (typeof data.license_key === 'string') {
        setLicenseKey(data.license_key);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا در دریافت لایسنس',
        description: error instanceof Error ? error.message : 'خطای ناشناخته',
      });
    } finally {
      setIsLoading(false);
    }
  }, [db, toast]);

  useEffect(() => {
    loadLicense();
  }, [loadLicense]);

  const handleCopy = async () => {
    if (!licenseKey) return;
    await navigator.clipboard.writeText(licenseKey);
    toast({ title: 'کلید لایسنس کپی شد' });
  };

  const handleRegenerate = async () => {
    if (!db) return;
    setIsRegenerating(true);
    try {
      const data = await db.regenerateDesktopLicense();
      setLicenseInfo(data);
      if (typeof data.license_key === 'string') {
        setLicenseKey(data.license_key);
      }
      toast({ title: 'کلید لایسنس جدید صادر شد' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا در صدور کلید جدید',
        description: error instanceof Error ? error.message : 'خطای ناشناخته',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>لایسنس نسخه دسکتاپ</CardTitle>
        <CardDescription>
          این کلید را در نرم‌افزار دسکتاپ (Electron) در بخش تنظیمات وارد کنید.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">وضعیت</span>
              <Badge>{String(licenseInfo?.status || 'active')}</Badge>
            </div>
            {licenseInfo?.key_hint && (
              <p className="text-sm text-muted-foreground">
                راهنما: {String(licenseInfo.key_hint)}
              </p>
            )}
            {licenseKey ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-sm" dir="ltr">
                {licenseKey}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {String(licenseInfo?.message || 'کلید کامل فقط پس از ایجاد یا بازتولید نمایش داده می‌شود.')}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {licenseKey && (
                <Button variant="outline" onClick={handleCopy}>
                  <Copy className="ms-2 h-4 w-4" />
                  کپی کلید
                </Button>
              )}
              <Button variant="outline" onClick={loadLicense} disabled={isLoading}>
                بروزرسانی
              </Button>
              <Button onClick={handleRegenerate} disabled={isRegenerating}>
                {isRegenerating && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="ms-2 h-4 w-4" />
                صدور کلید جدید
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
