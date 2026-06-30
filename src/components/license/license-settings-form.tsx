'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getLocalApiURL } from '@/lib/api-url';
import { fetchLicenseStatus } from '@/lib/license/engine';
import type { LicenseStatusResponse } from '@/lib/license/types';
import { Badge } from '@/components/ui/badge';

export function LicenseSettingsForm() {
  const { toast } = useToast();
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState<LicenseStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchLicenseStatus();
      setStatus(data);
    } catch {
      setStatus({
        valid: false,
        status: 'inactive',
        message: 'خطا در دریافت وضعیت لایسنس',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      toast({ variant: 'destructive', title: 'کلید لایسنس را وارد کنید' });
      return;
    }

    setIsActivating(true);
    try {
      const response = await fetch(`${getLocalApiURL()}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: licenseKey.trim() }),
      });

      const data = await response.json();
      if (!response.ok || !data.valid) {
        throw new Error(data.message || 'فعال‌سازی لایسنس ناموفق بود');
      }

      setStatus(data);
      setLicenseKey('');
      toast({ title: 'لایسنس با موفقیت فعال شد' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'فعال‌سازی ناموفق',
        description: error instanceof Error ? error.message : 'خطای ناشناخته',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      const response = await fetch(`${getLocalApiURL()}/api/license`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('حذف لایسنس ناموفق بود');
      }
      await loadStatus();
      toast({ title: 'لایسنس حذف شد' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: error instanceof Error ? error.message : 'خطای ناشناخته',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const statusLabel = (() => {
    if (!status) return 'نامشخص';
    switch (status.status) {
      case 'active': return 'فعال';
      case 'grace': return 'مهلت آفلاین';
      case 'expired': return 'منقضی';
      case 'revoked': return 'لغو شده';
      default: return 'غیرفعال';
    }
  })();

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>لایسنس نرم‌افزار</CardTitle>
        <CardDescription>
          کلید لایسنس دسکتاپ را وارد کنید. اعتبارسنجی ماهانه با سرور لایسنس انجام می‌شود.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری وضعیت لایسنس...
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">وضعیت</span>
              <Badge variant={status?.valid ? 'default' : 'destructive'}>{statusLabel}</Badge>
            </div>
            {status?.expires_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">انقضا</span>
                <span>{new Date(status.expires_at).toLocaleDateString('fa-IR')}</span>
              </div>
            )}
            {status?.last_check_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">آخرین بررسی</span>
                <span>{new Date(status.last_check_at).toLocaleDateString('fa-IR')}</span>
              </div>
            )}
            {status?.grace_days_left != null && status.grace_days_left > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">روزهای باقی‌مانده مهلت آفلاین</span>
                <span>{status.grace_days_left}</span>
              </div>
            )}
            {status?.message && !status.valid && (
              <p className="text-sm text-destructive">{status.message}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="license-key">کلید لایسنس</Label>
          <Input
            id="license-key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="ESAC-XXXX-XXXX-XXXX"
            dir="ltr"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleActivate} disabled={isActivating || isLoading}>
            {isActivating && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            فعال‌سازی لایسنس
          </Button>
          <Button variant="outline" onClick={loadStatus} disabled={isLoading}>
            بروزرسانی وضعیت
          </Button>
          {status?.valid && (
            <Button variant="destructive" onClick={handleRemove} disabled={isRemoving}>
              {isRemoving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              حذف لایسنس
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
