'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  PlusCircle,
  Trash2,
  Pencil,
  Paperclip,
  Search,
  CreditCard,
  Loader2,
  Eye,
  Link2,
} from 'lucide-react';
import type { Payment, PaymentMethod, Attachment, Sale, ProductMedia } from '@/lib/types';
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
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CURRENCY_SYMBOLS } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { _resolveModulec4803d } from '@/lib/license/gates/payments';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/components/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { PersianDate, PersianDatePicker } from '@/components/persian-date';
import { ProductMediaManager } from '@/components/product-media-manager';
import { Badge } from '@/components/ui/badge';
import { formatPersianDate } from '@/lib/date-utils';
import Link from 'next/link';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'نقد',
  CARD: 'کارتخوان',
  ONLINE: 'آنلاین',
};

const PAGE_SIZE = 10;

const attachmentSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, 'تاریخ سند الزامی است'),
  description: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptImage: z.string().optional(),
  media: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        type: z.enum(['image', 'video']),
        name: z.string().optional(),
      })
    )
    .default([]),
});

const paymentFormSchema = z.object({
  amount: z.coerce.number().min(1, 'مبلغ باید بزرگتر از صفر باشد'),
  method: z.enum(['CASH', 'CARD', 'ONLINE']),
  date: z.string().min(1, 'تاریخ پرداخت الزامی است'),
});

type PaymentWithDetails = Payment & {
  attachments: Attachment[];
  linkedSale?: Sale;
};

type AttachmentFormData = z.infer<typeof attachmentSchema>;

function getAttachmentMedia(attachment: Attachment): ProductMedia[] {
  if (attachment.media && attachment.media.length > 0) return attachment.media;
  if (!attachment.receiptImage) return [];
  return [
    {
      id: attachment.id,
      url: attachment.receiptImage,
      type: 'image',
      name: attachment.receiptNumber || 'سند',
    },
  ];
}

function AttachmentMediaGrid({ attachment }: { attachment: Attachment }) {
  const media = getAttachmentMedia(attachment);
  if (media.length === 0) return null;

  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {media.map((item) => (
        <div key={item.id} className="aspect-video overflow-hidden rounded-md border bg-muted">
          {item.type === 'video' ? (
            <video src={item.url} controls className="h-full w-full object-cover" />
          ) : (
            <img src={item.url} alt={item.name || 'سند پرداخت'} className="h-full w-full object-cover" />
          )}
        </div>
      ))}
    </div>
  );
}

function AttachmentForm({
  onAddAttachment,
  initialData,
  onUpdate,
}: {
  onAddAttachment?: (data: AttachmentFormData) => void;
  initialData?: AttachmentFormData;
  onUpdate?: (data: AttachmentFormData) => void;
}) {
  const { db } = useAppContext();
  const isEdit = Boolean(initialData && onUpdate);

  const form = useForm<AttachmentFormData>({
    resolver: zodResolver(attachmentSchema),
    defaultValues: initialData || {
      description: '',
      receiptNumber: '',
      receiptImage: '',
      media: [],
      date: new Date().toISOString().slice(0, 16),
    },
  });

  const media = form.watch('media') || [];

  const handleSubmit = (data: AttachmentFormData) => {
    const currentMedia = form.getValues('media') || [];
    const firstImage = currentMedia.find((item) => item.type === 'image');
    const payload = {
      ...data,
      media: currentMedia,
      receiptImage: data.receiptImage || firstImage?.url,
    };
    if (isEdit && onUpdate) {
      onUpdate(payload);
    } else if (onAddAttachment) {
      onAddAttachment(payload);
      form.reset({
        description: '',
        receiptNumber: '',
        receiptImage: '',
        media: [],
        date: new Date().toISOString().slice(0, 16),
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.stopPropagation();
          form.handleSubmit(handleSubmit)(event);
        }}
        className="space-y-4 p-4 border rounded-md"
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>تاریخ و ساعت سند</FormLabel>
              <FormControl>
                <PersianDatePicker includeTime value={field.value} onChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>توضیحات (اختیاری)</FormLabel>
              <FormControl>
                <Textarea placeholder="جزئیات بیشتر..." {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="receiptNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>شماره رسید/سند (اختیاری)</FormLabel>
              <FormControl>
                <Input placeholder="123456" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="media"
          render={() => (
            <FormItem>
              <FormLabel>رسانه سند</FormLabel>
              <FormControl>
                <ProductMediaManager
                  value={media as ProductMedia[]}
                  onChange={(value) =>
                    form.setValue('media', value, { shouldDirty: true, shouldValidate: true })
                  }
                  uploadFile={(file) => db!.uploadFile(file)}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <DialogClose asChild>
          <Button type="submit" disabled={!db}>
            {isEdit ? 'ذخیره سند' : 'افزودن سند'}
          </Button>
        </DialogClose>
      </form>
    </Form>
  );
}

function PaymentForm({
  paymentToEdit,
  onSuccess,
}: {
  paymentToEdit?: PaymentWithDetails;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { db } = useAppContext();
  const [attachments, setAttachments] = useState<AttachmentFormData[]>(
    paymentToEdit?.attachments.map((att) => ({
      id: att.id,
      date: att.date,
      description: att.description,
      receiptNumber: att.receiptNumber,
      receiptImage: att.receiptImage,
      media: att.media || [],
    })) || []
  );
  const [editingAttachmentIndex, setEditingAttachmentIndex] = useState<number | null>(null);
  const [isAddAttachmentOpen, setIsAddAttachmentOpen] = useState(false);

  const form = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: paymentToEdit
      ? { amount: paymentToEdit.amount, method: paymentToEdit.method, date: paymentToEdit.date }
      : { amount: 0, method: 'CARD', date: new Date().toISOString().slice(0, 16) },
  });

  const { formState: { isSubmitting } } = form;

  const handleAddAttachment = (data: AttachmentFormData) => {
    setAttachments((prev) => [...prev, { ...data, id: `new-${Date.now()}` }]);
    setIsAddAttachmentOpen(false);
    toast({ title: 'سند اضافه شد', description: 'برای ذخیره نهایی، دکمه «ذخیره تغییرات» را بزنید.' });
  };

  const handleUpdateAttachment = (index: number, data: AttachmentFormData) => {
    setAttachments((prev) => {
      const updated = [...prev];
      updated[index] = { ...data, id: prev[index].id || `new-${Date.now()}` };
      return updated;
    });
    setEditingAttachmentIndex(null);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: z.infer<typeof paymentFormSchema>) => {
    if (!db) return;
    try {
      const attachmentPayload = attachments.map((att) => ({
        id: att.id,
        date: att.date,
        description: att.description,
        receiptNumber: att.receiptNumber,
        receiptImage: att.receiptImage,
        media: att.media,
      }));

      if (paymentToEdit) {
        await db.updatePayment(
          {
            id: paymentToEdit.id,
            amount: data.amount,
            method: data.method,
            date: data.date,
            attachmentIds: paymentToEdit.attachmentIds,
          },
          attachmentPayload
        );
        toast({ title: 'موفق', description: 'پرداخت با موفقیت بروزرسانی شد.' });
      } else {
        await db.addPayment({ ...data, attachmentIds: [] }, attachmentPayload);
        toast({ title: 'موفق', description: 'پرداخت جدید با موفقیت ثبت شد.' });
        form.reset({ amount: 0, method: 'CARD', date: new Date().toISOString().slice(0, 16) });
        setAttachments([]);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'خطا', description: 'عملیات ناموفق بود.' });
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>{paymentToEdit ? 'ویرایش پرداخت' : 'ثبت پرداخت جدید'}</CardTitle>
        <CardDescription>
          {paymentToEdit
            ? 'جزئیات پرداخت و اسناد آن را ویرایش کنید.'
            : 'پرداخت مستقل (بدون فروش) یا پرداخت جدید را ثبت کنید.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مبلغ (تومان)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="500,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاریخ و ساعت پرداخت</FormLabel>
                    <FormControl>
                      <PersianDatePicker includeTime value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>روش پرداخت</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(paymentMethodLabels).map(([method, label]) => (
                        <SelectItem key={method} value={method}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>اسناد پرداخت</Label>
              {attachments.map((att, index) => (
                <div key={att.id || index} className="flex items-center justify-between p-2 border rounded-md">
                  <span>{att.receiptNumber || att.description || 'سند'}</span>
                  <div className="flex gap-1">
                    <Dialog
                      open={editingAttachmentIndex === index}
                      onOpenChange={(open) => setEditingAttachmentIndex(open ? index : null)}
                    >
                      <DialogTrigger asChild>
                        <Button type="button" size="icon" variant="ghost">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>ویرایش سند</DialogTitle>
                        </DialogHeader>
                        <AttachmentForm
                          initialData={att}
                          onUpdate={(data) => handleUpdateAttachment(index, data)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <Dialog open={isAddAttachmentOpen} onOpenChange={setIsAddAttachmentOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    افزودن سند
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>افزودن سند جدید</DialogTitle>
                  </DialogHeader>
                  <AttachmentForm onAddAttachment={handleAddAttachment} />
                </DialogContent>
              </Dialog>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !db}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? 'در حال ثبت...' : paymentToEdit ? 'ذخیره تغییرات' : 'ثبت پرداخت'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function PaymentListItem({
  payment,
  onUpdate,
}: {
  payment: PaymentWithDetails;
  onUpdate: () => void;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { db } = useAppContext();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!db) return;
    try {
      await db.deletePayment(payment.id);
      toast({ title: 'پرداخت حذف شد', description: 'پرداخت با موفقیت حذف شد.' });
      onUpdate();
    } catch (error) {
      toast({ variant: 'destructive', title: 'خطا', description: 'حذف پرداخت ناموفق بود.' });
    }
  };

  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-full bg-muted text-muted-foreground">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">
              {payment.amount.toLocaleString('fa-IR')} {CURRENCY_SYMBOLS.TOMAN}
            </p>
            <Badge variant="secondary">{paymentMethodLabels[payment.method]}</Badge>
            {payment.linkedSale && (
              <Badge variant="outline" className="gap-1">
                <Link2 className="h-3 w-3" />
                فروش #{payment.linkedSale.id}
                {payment.linkedSale.customerName && ` - ${payment.linkedSale.customerName}`}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <PersianDate value={payment.date} format="dateTime" />
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {payment.attachments.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Paperclip className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>اسناد پرداخت</DialogTitle>
              </DialogHeader>
              <ul className="space-y-3">
                {payment.attachments.map((att) => (
                  <li key={att.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{att.description || att.receiptNumber || 'سند پرداخت'}</p>
                      <p className="text-xs text-muted-foreground">
                        <PersianDate value={att.date} format="dateTime" />
                      </p>
                    </div>
                    {att.receiptNumber && (
                      <p className="mt-1 text-xs text-muted-foreground">شماره سند: {att.receiptNumber}</p>
                    )}
                    <AttachmentMediaGrid attachment={att} />
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              جزئیات
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>جزئیات پرداخت</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">روش</p>
                <p className="font-medium">{paymentMethodLabels[payment.method]}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">مبلغ</p>
                <p className="font-medium">
                  {payment.amount.toLocaleString('fa-IR')} {CURRENCY_SYMBOLS.TOMAN}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">تاریخ</p>
                <p className="font-medium">
                  <PersianDate value={payment.date} format="dateTime" />
                </p>
              </div>
            </div>
            {payment.linkedSale && (
              <div className="rounded-md border p-3 text-sm">
                <p className="text-muted-foreground">مرتبط با فروش</p>
                <p className="font-medium">
                  فروش #{payment.linkedSale.id}
                  {payment.linkedSale.customerName && ` — ${payment.linkedSale.customerName}`}
                </p>
                <Link href="/dashboard/sales-history" className="text-xs text-primary hover:underline">
                  مشاهده تاریخچه فروش
                </Link>
              </div>
            )}
            <div className="space-y-2">
              <h4 className="font-semibold">اسناد پرداخت ({payment.attachments.length})</h4>
              {payment.attachments.length > 0 ? (
                <ul className="space-y-3">
                  {payment.attachments.map((att) => (
                    <li key={att.id} className="rounded-md border p-3">
                      <AttachmentMediaGrid attachment={att} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  سندی ثبت نشده است.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>ویرایش پرداخت</DialogTitle>
            </DialogHeader>
            <PaymentForm
              paymentToEdit={payment}
              onSuccess={() => {
                onUpdate();
                setIsEditDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>آیا مطمئن هستید؟</AlertDialogTitle>
              <AlertDialogDescription>
                این پرداخت برای همیشه حذف خواهد شد.
                {payment.linkedSale &&
                  ' توجه: این پرداخت به یک فروش مرتبط است و حذف آن ممکن است مانده فروش را تحت تأثیر قرار دهد.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>لغو</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

type MethodFilter = 'all' | PaymentMethod;

export default function PaymentsPage() {
  const { db, isLoading, setGlobalLoading } = useAppContext();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return;
    _resolveModulec4803d().catch(() => {});
  }, []);

  const fetchPayments = async () => {
    if (!db) return;
    setGlobalLoading(true);
    try {
      const [allPayments, allSales] = await Promise.all([db.getAllPayments(), db.getAllSales()]);

      const saleByPaymentId = new Map<string, Sale>();
      for (const sale of allSales) {
        for (const pid of sale.paymentIds || []) {
          saleByPaymentId.set(pid, sale);
        }
      }

      const paymentsWithDetails: PaymentWithDetails[] = await Promise.all(
        allPayments.map(async (payment) => {
          const attachments = await db.getAttachmentsBySourceId(payment.id);
          return {
            ...payment,
            attachments,
            linkedSale: saleByPaymentId.get(payment.id),
          };
        })
      );

      setPayments(paymentsWithDetails);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'بارگذاری لیست پرداخت‌ها ناموفق بود.',
      });
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    if (db) fetchPayments();
  }, [db]);

  const filteredPayments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return payments.filter((payment) => {
      if (methodFilter !== 'all' && payment.method !== methodFilter) return false;

      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(payment.date) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(payment.date) > to) return false;
      }

      if (!query) return true;

      const searchable = [
        payment.id,
        payment.amount.toString(),
        paymentMethodLabels[payment.method],
        formatPersianDate(payment.date),
        formatPersianDate(payment.date, 'dateTime'),
        payment.linkedSale?.customerName || '',
        payment.linkedSale?.id?.toString() || '',
        ...payment.attachments.flatMap((att) => [
          att.description || '',
          att.receiptNumber || '',
        ]),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [payments, searchTerm, methodFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, methodFilter, dateFrom, dateTo]);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="md:col-span-2">
          <Skeleton className="h-[70vh] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="پرداخت‌ها" description="ثبت و مدیریت پرداخت‌های مشتریان" />
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <PaymentForm onSuccess={fetchPayments} />
      </div>
      <div className="md:col-span-2">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو (مشتری، مبلغ، شماره سند...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as MethodFilter)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="روش پرداخت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه روش‌ها</SelectItem>
                {Object.entries(paymentMethodLabels).map(([method, label]) => (
                  <SelectItem key={method} value={method}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-[150px]"
              title="از تاریخ"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-[150px]"
              title="تا تاریخ"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredPayments.length.toLocaleString('fa-IR')} پرداخت
            {filteredPayments.length !== payments.length &&
              ` (از ${payments.length.toLocaleString('fa-IR')} کل)`}
          </p>
        </div>
        <Card variant="glass">
          <CardContent className="p-0">
            <ScrollArea className="h-[65vh]">
              {paginatedPayments.length > 0 ? (
                <ul className="divide-y divide-border">
                  {paginatedPayments.map((payment) => (
                    <PaymentListItem key={payment.id} payment={payment} onUpdate={fetchPayments} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="پرداختی یافت نشد"
                  description={
                    payments.length === 0
                      ? 'اولین پرداخت خود را از فرم کنار صفحه ثبت کنید.'
                      : 'فیلترها یا عبارت جستجو را تغییر دهید.'
                  }
                  className="m-4 border-none bg-transparent"
                />
              )}
            </ScrollArea>
            {filteredPayments.length > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t p-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  قبلی
                </Button>
                <span className="text-sm text-muted-foreground">
                  صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  بعدی
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
