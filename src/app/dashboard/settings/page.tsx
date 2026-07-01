
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, PlusCircle, Users, Database, Loader2, Store, Banknote, Tag, Pencil, KeyRound, FolderOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

import type { ExchangeRate, CostTitle, Employee, AppSettings } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';
import { useAppContext } from '@/components/app-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StorageType } from '@/components/app-provider';
import { ALLOWED_STORAGE_TYPES, IS_ELECTRON_BUILD } from '@/lib/build-config';
import { LicenseSettingsForm } from '@/components/license/license-settings-form';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getLocalApiURL, getRemoteApiURL } from '@/lib/api-url';
import {
  applyOfflineStorageFolder,
  getOfflineStorageInfo,
  isElectronOfflineStorageAvailable,
  restoreOfflineDatabase,
  selectOfflineStorageFolder,
} from '@/lib/electron-offline-storage';
import type { OfflineStorageInfo } from '@/types/electron';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const appSettingsSchema = z.object({
  shopName: z.string().min(1, 'نام فروشگاه الزامی است'),
});

const exchangeRatesSchema = z.object({
  rates: z.array(
    z.object({
      currency: z.enum(['USD', 'AED', 'CNY']),
      rate: z.coerce.number().min(0, 'نرخ باید مثبت باشد'),
    })
  ),
});

const costTitleSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است'),
});

const employeeSchema = z.object({
  name: z.string().min(1, 'نام کارمند الزامی است'),
  position: z.string().min(1, 'سمت الزامی است'),
  salary: z.coerce.number().min(0, 'حقوق نمی‌تواند منفی باشد'),
  email: z.string().email('ایمیل نامعتبر است').optional().or(z.literal('')),
  password: z.string().min(6, 'رمز عبور حداقل ۶ کاراکتر').optional().or(z.literal('')),
});


function AppSettingsForm() {
  const { toast } = useToast();
  const { db, settings, setSettings } = useAppContext();
  const form = useForm<z.infer<typeof appSettingsSchema>>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      shopName: settings.shopName || '',
    },
  });

  const { formState: { isSubmitting } } = form;

  useEffect(() => {
    form.reset({ shopName: settings.shopName || '' });
  }, [settings, form]);

  const onSubmit = async (data: z.infer<typeof appSettingsSchema>) => {
    if (!db) return;
    try {
      const newSettings = { ...settings, ...data };
      await db.saveAppSettings(newSettings);
      setSettings(newSettings);
      toast({ title: 'تنظیمات ذخیره شد', description: 'نام فروشگاه با موفقیت به‌روزرسانی شد.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'ذخیره تنظیمات ناموفق بود.',
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>اطلاعات فروشگاه</CardTitle>
        <CardDescription>نام فروشگاه خود را برای نمایش در برنامه تنظیم کنید.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shopName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام فروشگاه</FormLabel>
                  <FormControl>
                    <Input placeholder="نام فروشگاه شما" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting || !db}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'در حال ذخیره...' : 'ذخیره نام'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ExchangeRatesForm() {
  const { toast } = useToast();
  const { db, setGlobalLoading } = useAppContext();
  const form = useForm<z.infer<typeof exchangeRatesSchema>>({
    resolver: zodResolver(exchangeRatesSchema),
    defaultValues: {
      rates: [],
    },
  });

  const { formState: { isSubmitting } } = form;

  useEffect(() => {
    if (!db) return;
    async function loadRates() {
      setGlobalLoading(true);
      const rates = await db.getExchangeRates();
      form.reset({ rates });
      setGlobalLoading(false);
    }
    loadRates();
  }, [form, db, setGlobalLoading]);

  const onSubmit = async (data: z.infer<typeof exchangeRatesSchema>) => {
    if (!db) return;
    try {
      await db.saveExchangeRates(data.rates as ExchangeRate[]);
      toast({ title: 'نرخ ارز ذخیره شد', description: 'نرخ‌های جدید با موفقیت در سیستم ثبت شد.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'ذخیره نرخ ارز ناموفق بود.',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.watch('rates').map((rate, index) => (
          <FormField
            key={index}
            control={form.control}
            name={`rates.${index}.rate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{`نرخ ${rate.currency} به تومان`}</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <Button type="submit" disabled={isSubmitting || !db}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "در حال ذخیره..." : "ذخیره نرخ‌ها"}
        </Button>
      </form>
    </Form>
  );
}

function CostTitlesForm() {
  const { toast } = useToast();
  const { db, setGlobalLoading } = useAppContext();
  const [costTitles, setCostTitles] = useState<CostTitle[]>([]);
  const form = useForm<z.infer<typeof costTitleSchema>>({
    resolver: zodResolver(costTitleSchema),
    defaultValues: { title: '' },
  });

  const { formState: { isSubmitting } } = form;

  const fetchCostTitles = useCallback(async () => {
    if (!db) return;
    setGlobalLoading(true);
    const titles = await db.getCostTitles();
    setCostTitles(titles);
    setGlobalLoading(false);
  }, [db, setGlobalLoading]);

  useEffect(() => {
    fetchCostTitles();
  }, [fetchCostTitles]);

  const onSubmit = async (data: z.infer<typeof costTitleSchema>) => {
    if (!db) return;
    try {
      const newTitle = { id: Date.now().toString(), title: data.title };
      await db.addCostTitle(newTitle);
      toast({ title: 'عنوان هزینه افزوده شد', description: 'عنوان جدید برای هزینه‌ها ثبت شد.' });
      form.reset();
      fetchCostTitles();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'افزودن عنوان هزینه ناموفق بود.',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await db.deleteCostTitle(id);
      toast({ title: 'عنوان هزینه حذف شد', description: 'عنوان هزینه با موفقیت حذف شد.' });
      fetchCostTitles();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'حذف عنوان هزینه ناموفق بود.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormLabel>عنوان جدید</FormLabel>
                <FormControl>
                  <Input placeholder="مثال: هزینه حمل و نقل" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting || !db}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isSubmitting ? "در حال افزودن..." : "افزودن"}
          </Button>
        </form>
      </Form>
      <div className="space-y-2">
        <h3 className="font-medium">عناوین هزینه موجود</h3>
        {costTitles.length > 0 ? (
          <ul className="rounded-md border">
            {costTitles.map((item) => (
              <li key={item.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                {item.title}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">هیچ عنوان هزینه‌ای یافت نشد.</p>
        )}
      </div>
    </div>
  );
}

function EmployeeForm() {
  const { toast } = useToast();
  const { db, setGlobalLoading } = useAppContext();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: '', position: '', salary: 0, email: '', password: '' },
  });

  const editForm = useForm<{ name: string; position: string; salary: number; isActive: boolean }>({
    defaultValues: { name: '', position: '', salary: 0, isActive: true },
  });

  const { formState: { isSubmitting } } = form;

  const fetchEmployees = useCallback(async () => {
    if (!db) return;
    setGlobalLoading(true);
    const allEmployees = await db.getAllEmployees();
    setEmployees(allEmployees);
    setGlobalLoading(false);
  }, [db, setGlobalLoading]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const onSubmit = async (data: z.infer<typeof employeeSchema>) => {
    if (!db) return;
    try {
      const payload = {
        name: data.name,
        position: data.position,
        salary: data.salary,
        ...(data.email && data.password ? { email: data.email, password: data.password } : {}),
      };
      await db.addEmployee(payload);
      toast({ title: 'کارمند افزوده شد', description: 'کارمند و هزینه دوره‌ای حقوق با موفقیت ایجاد شد.' });
      form.reset({ name: '', position: '', salary: 0, email: '', password: '' });
      fetchEmployees();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: error instanceof Error ? error.message : 'افزودن کارمند ناموفق بود.',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await db.deleteEmployee(id);
      toast({ title: 'کارمند حذف شد', description: 'کارمند و هزینه دوره‌ای مرتبط حذف شد.' });
      fetchEmployees();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'حذف کارمند ناموفق بود.',
      });
    }
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    editForm.reset({
      name: employee.name,
      position: employee.position,
      salary: employee.salary,
      isActive: employee.isActive !== false,
    });
  };

  const handleEditSave = async () => {
    if (!db || !editingEmployee) return;
    const data = editForm.getValues();
    try {
      await db.updateEmployee(editingEmployee.id, data);
      toast({ title: 'کارمند به‌روز شد', description: 'اطلاعات و هزینه دوره‌ای حقوق همگام‌سازی شد.' });
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'به‌روزرسانی کارمند ناموفق بود.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-md">
          <h3 className="text-lg font-medium">افزودن کارمند جدید</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>نام</FormLabel>
                <FormControl><Input placeholder="نام کامل کارمند" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="position" render={({ field }) => (
              <FormItem>
                <FormLabel>سمت</FormLabel>
                <FormControl><Input placeholder="مثال: فروشنده" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="salary" render={({ field }) => (
              <FormItem>
                <FormLabel>حقوق ماهانه (تومان)</FormLabel>
                <FormControl><Input type="number" placeholder="10,000,000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="rounded-md border p-4 space-y-4">
            <h4 className="text-sm font-medium">ایجاد حساب کاربری (اختیاری)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>ایمیل ورود</FormLabel>
                  <FormControl><Input type="email" placeholder="employee@shop.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>رمز عبور</FormLabel>
                  <FormControl><Input type="password" placeholder="حداقل ۶ کاراکتر" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting || !db}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {isSubmitting ? 'در حال افزودن...' : 'افزودن کارمند'}
          </Button>
        </form>
      </Form>
      <div className="space-y-2">
        <h3 className="font-medium">لیست کارمندان</h3>
        {employees.length > 0 ? (
          <ul className="rounded-md border">
            {employees.map((item) => (
              <li key={item.id} className="flex items-center justify-between p-3 border-b last:border-b-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-muted shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{item.name}</p>
                      {item.isActive === false ? (
                        <Badge variant="secondary">غیرفعال</Badge>
                      ) : (
                        <Badge variant="chip">فعال</Badge>
                      )}
                      {item.userProfileId && (
                        <Badge variant="outline">دارای حساب کاربری</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-sm hidden sm:inline">{item.salary.toLocaleString('fa-IR')} تومان</span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center p-4">هیچ کارمندی ثبت نشده است.</p>
        )}
      </div>

      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ویرایش کارمند</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نام</Label>
              <Input {...editForm.register('name')} />
            </div>
            <div>
              <Label>سمت</Label>
              <Input {...editForm.register('position')} />
            </div>
            <div>
              <Label>حقوق ماهانه (تومان)</Label>
              <Input type="number" {...editForm.register('salary', { valueAsNumber: true })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>فعال</Label>
              <Switch
                checked={editForm.watch('isActive')}
                onCheckedChange={(checked) => editForm.setValue('isActive', checked)}
              />
            </div>
            <Button onClick={handleEditSave} className="w-full">ذخیره تغییرات</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StorageSettingsForm() {
  const { toast } = useToast();
  const { storageType, changeStorageType } = useAppContext();
  const [pendingStorageType, setPendingStorageType] = useState<StorageType>(storageType);
  const [testedStorageType, setTestedStorageType] = useState<StorageType | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [offlineStorageInfo, setOfflineStorageInfo] = useState<OfflineStorageInfo | null>(null);
  const [pendingFolderPath, setPendingFolderPath] = useState<string | null>(null);
  const [isFolderConfirmOpen, setIsFolderConfirmOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isApplyingFolder, setIsApplyingFolder] = useState(false);
  const [isRestoringDatabase, setIsRestoringDatabase] = useState(false);

  const storageOptions = [
    { value: 'sqlite' as const, label: 'آفلاین', desc: 'ذخیره‌سازی محلی روی درایو یا پوشه دلخواه' },
    { value: 'online' as const, label: 'آنلاین (سرور)', desc: 'Backend API + MySQL روی سرور' },
  ].filter((option) => ALLOWED_STORAGE_TYPES.includes(option.value));

  const showOfflineFolderSettings = IS_ELECTRON_BUILD
    && isElectronOfflineStorageAvailable()
    && (storageType === 'sqlite' || pendingStorageType === 'sqlite');

  const loadOfflineStorageInfo = useCallback(async () => {
    if (!showOfflineFolderSettings) {
      setOfflineStorageInfo(null);
      return;
    }
    try {
      const info = await getOfflineStorageInfo();
      setOfflineStorageInfo(info);
    } catch (error) {
      console.error('Failed to load offline storage info:', error);
    }
  }, [showOfflineFolderSettings]);

  useEffect(() => {
    setPendingStorageType(storageType);
    setTestedStorageType(null);
  }, [storageType]);

  useEffect(() => {
    void loadOfflineStorageInfo();
  }, [loadOfflineStorageInfo]);

  const getApiURL = (value: StorageType) => (
    value === 'online' ? getRemoteApiURL() : getLocalApiURL()
  );

  const handleSelectOfflineFolder = async () => {
    try {
      const folderPath = await selectOfflineStorageFolder();
      if (!folderPath) {
        return;
      }
      setPendingFolderPath(folderPath);
      setIsFolderConfirmOpen(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'انتخاب پوشه ناموفق بود',
        description: error instanceof Error ? error.message : 'پوشه انتخاب نشد.',
      });
    }
  };

  const confirmOfflineFolderChange = async () => {
    if (!pendingFolderPath) {
      return;
    }

    setIsApplyingFolder(true);
    try {
      await applyOfflineStorageFolder(pendingFolderPath);
      setIsFolderConfirmOpen(false);
      setPendingFolderPath(null);
      toast({
        title: 'محل ذخیره‌سازی آفلاین تغییر کرد',
        description: 'دیتابیس و فایل‌های آپلود به پوشه جدید کپی شدند.',
      });
      window.location.reload();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'تغییر محل ذخیره‌سازی ناموفق بود',
        description: error instanceof Error ? error.message : 'کپی دیتابیس به پوشه جدید انجام نشد.',
      });
    } finally {
      setIsApplyingFolder(false);
    }
  };

  const confirmRestoreOfflineDatabase = async () => {
    setIsRestoringDatabase(true);
    try {
      const info = await restoreOfflineDatabase();
      setIsRestoreConfirmOpen(false);
      setOfflineStorageInfo(info);
      toast({
        title: 'بازیابی موفق بود',
        description: 'آخرین نسخه پشتیبان به محل ذخیره‌سازی کپی شد.',
      });
      window.location.reload();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'بازیابی ناموفق بود',
        description: error instanceof Error ? error.message : 'کپی نسخه پشتیبان انجام نشد.',
      });
    } finally {
      setIsRestoringDatabase(false);
    }
  };

  const testStorageConnection = async () => {
    const option = storageOptions.find(o => o.value === pendingStorageType);

    if (pendingStorageType === storageType) {
      toast({
        title: 'بدون تغییر',
        description: 'محل ذخیره‌سازی انتخاب‌شده همین حالا فعال است.',
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      if (pendingStorageType === 'sqlite' || pendingStorageType === 'online') {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 8000);
        const response = await fetch(`${getApiURL(pendingStorageType)}/health`, {
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('پاسخ API نامعتبر بود.');
        }
      }

      setTestedStorageType(pendingStorageType);
      setIsConfirmOpen(true);
      toast({
        title: 'تست اتصال موفق بود',
        description: `${option?.label || 'محل ذخیره‌سازی'} آماده استفاده است.`,
      });
    } catch (error) {
      setTestedStorageType(null);
      toast({
        variant: 'destructive',
        title: 'تست اتصال ناموفق بود',
        description: error instanceof Error ? error.message : 'اتصال به محل ذخیره‌سازی برقرار نشد.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const confirmStorageChange = () => {
    const option = storageOptions.find(o => o.value === pendingStorageType);
    changeStorageType(pendingStorageType);
    toast({
      title: 'محل ذخیره‌سازی تغییر کرد',
      description: `داده‌ها از این پس در ${option?.desc || pendingStorageType} ذخیره می‌شوند.`,
    });
    window.location.reload();
  };

  const handleStorageSelect = (value: StorageType) => {
    setPendingStorageType(value);
    setTestedStorageType(null);
  }

  const handleLogout = () => {
    localStorage.removeItem('apiToken');
    toast({
      title: 'خروج از سیستم',
      description: 'با موفقیت از API خارج شدید'
    });
    window.location.reload();
  }

  const isAPIMode = storageType === 'mysql' || storageType === 'sqlite' || storageType === 'online';
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('apiToken');
  const selectedOption = storageOptions.find(option => option.value === pendingStorageType);
  const currentOption = storageOptions.find(option => option.value === storageType);
  const hasPendingChange = pendingStorageType !== storageType;

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>محل ذخیره‌سازی</Label>
          <Select onValueChange={handleStorageSelect} value={pendingStorageType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="انتخاب محل ذخیره‌سازی" />
            </SelectTrigger>
            <SelectContent>
              {storageOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showOfflineFolderSettings && (
          <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">محل ذخیره‌سازی آفلاین (الزامی)</p>
              <p className="text-xs text-muted-foreground">
                دیتابیس و فایل‌های آپلود باید در پوشه‌ای خارج از محل نصب برنامه ذخیره شوند تا با نصب نسخه جدید، داده‌های شما از بین نرود.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offline-storage-path">پوشه فعال</Label>
              <Input
                id="offline-storage-path"
                readOnly
                value={
                  offlineStorageInfo?.requiresCustomDataDir
                    ? 'هنوز انتخاب نشده (الزامی)'
                    : (offlineStorageInfo?.activeDir || 'در حال بارگذاری...')
                }
                dir="ltr"
                className="font-mono text-xs"
              />
            </div>

            {offlineStorageInfo?.configuredButForbidden && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
                <p className="font-medium text-destructive">محل ذخیره‌سازی فعلی داخل پوشه نصب برنامه است.</p>
                <p className="mt-1 text-muted-foreground">
                  لطفاً پوشه جدیدی خارج از محل نصب برنامه انتخاب کنید.
                </p>
              </div>
            )}

            {offlineStorageInfo?.requiresCustomDataDir && !offlineStorageInfo?.configuredButForbidden && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  انتخاب پوشه ذخیره‌سازی برای حالت آفلاین الزامی است.
                </p>
              </div>
            )}

            {offlineStorageInfo?.missingDb && !offlineStorageInfo?.requiresCustomDataDir && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
                <p className="font-medium text-destructive">فایل دیتابیس در محل ذخیره‌سازی یافت نشد.</p>
                <p className="mt-1 text-muted-foreground">
                  {offlineStorageInfo.hasBackup
                    ? 'می‌توانید آخرین نسخه پشتیبان را به این محل کپی کنید.'
                    : 'نسخه پشتیبان موجود نیست.'}
                </p>
                {offlineStorageInfo.hasBackup && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => setIsRestoreConfirmOpen(true)}
                    disabled={isRestoringDatabase}
                  >
                    {isRestoringDatabase && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                    بازیابی از پشتیبان
                  </Button>
                )}
              </div>
            )}

            <Button
              type="button"
              variant={offlineStorageInfo?.requiresCustomDataDir ? 'default' : 'outline'}
              onClick={handleSelectOfflineFolder}
              disabled={isApplyingFolder || storageType !== 'sqlite'}
            >
              {isApplyingFolder
                ? <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                : <FolderOpen className="ms-2 h-4 w-4" />}
              {offlineStorageInfo?.requiresCustomDataDir ? 'انتخاب محل ذخیره‌سازی' : 'انتخاب محل دلخواه'}
            </Button>
          </div>
        )}

        <div className="min-h-20 rounded-md border bg-muted/30 p-3 text-sm">
          <p className="font-medium">
            محل فعال: {currentOption?.label || storageType}
          </p>
          <p className="mt-1 text-muted-foreground">
            {hasPendingChange
              ? `انتخاب جدید: ${selectedOption?.label || pendingStorageType}. برای اعمال، ابتدا اتصال را تست کنید.`
              : 'برای تغییر محل ذخیره‌سازی، یک گزینه دیگر را انتخاب کنید.'}
          </p>
          {testedStorageType === pendingStorageType && hasPendingChange && (
            <p className="mt-2 text-green-600 dark:text-green-400">
              تست اتصال با موفقیت انجام شد.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={testStorageConnection}
            disabled={!hasPendingChange || isTestingConnection}
          >
            {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isTestingConnection ? 'در حال تست اتصال...' : 'تست اتصال'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsConfirmOpen(true)}
            disabled={!hasPendingChange || testedStorageType !== pendingStorageType}
          >
            اعمال تغییر
          </Button>
        </div>

        {isAPIMode && hasToken && (
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  ✓ متصل به API
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  شما وارد سیستم شده‌اید
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
              >
                خروج
              </Button>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          تغییر محل ذخیره‌سازی فقط بعد از تست اتصال و تایید نهایی اعمال می‌شود. در صورت تغییر به یک دیتابیس دیگر، وضعیت ورود مربوط به همان دیتابیس استفاده خواهد شد.
        </p>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تغییر محل ذخیره‌سازی تایید شود؟</AlertDialogTitle>
            <AlertDialogDescription>
              اتصال به {selectedOption?.label || pendingStorageType} موفق بود. با تایید، محل ذخیره‌سازی برنامه تغییر می‌کند و صفحه برای بارگذاری دیتابیس جدید تازه‌سازی می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStorageChange}>
              تایید و اعمال تغییر
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isFolderConfirmOpen} onOpenChange={setIsFolderConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تغییر محل ذخیره‌سازی آفلاین</AlertDialogTitle>
            <AlertDialogDescription>
              دیتابیس و فایل‌های آپلود به پوشه انتخاب‌شده کپی می‌شوند. برنامه مجدداً راه‌اندازی می‌شود.
              {pendingFolderPath && (
                <span className="mt-2 block font-mono text-xs" dir="ltr">{pendingFolderPath}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplyingFolder}>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOfflineFolderChange} disabled={isApplyingFolder}>
              {isApplyingFolder ? 'در حال کپی...' : 'تایید و اعمال'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>بازیابی از پشتیبان</AlertDialogTitle>
            <AlertDialogDescription>
              فایل دیتابیس در محل ذخیره‌سازی یافت نشد. آیا می‌خواهید آخرین نسخه پشتیبان به این محل کپی شود؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoringDatabase}>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestoreOfflineDatabase} disabled={isRestoringDatabase}>
              {isRestoringDatabase ? 'در حال بازیابی...' : 'تایید و بازیابی'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function SettingsPage() {
  const { isLoading, user, isStorageConfigurable } = useAppContext();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'license' || tab === 'data-storage') {
      setActiveTab(tab);
    }
  }, []);

  const visibleTabs = [
    { value: 'general', label: 'عمومی', icon: Store },
    ...(isStorageConfigurable ? [{ value: 'data-storage', label: 'ذخیره‌سازی', icon: Database }] : []),
    ...(IS_ELECTRON_BUILD ? [{ value: 'license', label: 'لایسنس', icon: KeyRound }] : []),
    { value: 'exchange-rates', label: 'نرخ‌های ارز', icon: Banknote },
    { value: 'cost-titles', label: 'عناوین هزینه', icon: Tag },
    { value: 'employees', label: 'کارمندان', icon: Users },
  ];

  useEffect(() => {
    if (user?.role === 'employee') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (user?.role === 'employee') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="تنظیمات" description="پیکربندی فروشگاه، ارز، ذخیره‌سازی و کارمندان" />
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className={`grid w-full grid-cols-${visibleTabs.length} rounded-xl bg-white/5`} style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg">
              <tab.icon className="ms-1 h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="general">
          <AppSettingsForm />
        </TabsContent>
        {isStorageConfigurable && (
        <TabsContent value="data-storage">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>محل ذخیره‌سازی داده‌ها</CardTitle>
              <CardDescription>
                انتخاب بین ذخیره‌سازی آفلاین (محلی و خارج از محل نصب) یا سرور آنلاین با MySQL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <StorageSettingsForm />
            </CardContent>
          </Card>
        </TabsContent>
        )}
        {IS_ELECTRON_BUILD && (
        <TabsContent value="license">
          <LicenseSettingsForm />
        </TabsContent>
        )}
        <TabsContent value="exchange-rates">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>تنظیم نرخ ارز</CardTitle>
              <CardDescription>
                نرخ تبدیل ارزهای مختلف به تومان را برای محاسبه هزینه‌ها وارد کنید.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExchangeRatesForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cost-titles">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>مدیریت عناوین هزینه</CardTitle>
              <CardDescription>
                عناوین هزینه‌های پرتکرار را برای دسته‌بندی بهتر تعریف کنید.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CostTitlesForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="employees">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>مدیریت کارمندان</CardTitle>
              <CardDescription>
                اطلاعات کارمندان و حقوق آن‌ها را برای ثبت خودکار هزینه‌ها وارد کنید.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
