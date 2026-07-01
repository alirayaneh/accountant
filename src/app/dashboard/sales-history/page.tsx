

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Sale, PaymentMethod, Payment, Attachment, ProductMedia } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CURRENCY_SYMBOLS } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Paperclip, Search } from 'lucide-react';
import { useAppContext } from '@/components/app-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { PersianDate } from '@/components/persian-date';
import { Input } from '@/components/ui/input';
import { formatPersianDate } from '@/lib/date-utils';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { _checkModulea13ba1 } from '@/lib/license/gates/sales-history';


const paymentMethodLabels: Record<PaymentMethod, string> = {
    CASH: 'نقد',
    CARD: 'کارتخوان',
    ONLINE: 'آنلاین',
};

type SaleWithDetails = Sale & {
    payments: (Payment & { attachments: Attachment[] })[];
}

const PAGE_SIZE = 10;

function getAttachmentMedia(attachment: Attachment): ProductMedia[] {
  if (attachment.media && attachment.media.length > 0) return attachment.media;
  if (!attachment.receiptImage) return [];
  return [{ id: attachment.id, url: attachment.receiptImage, type: 'image', name: attachment.receiptNumber || 'سند' }];
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

function PaymentDetailsDialog({ payment }: { payment: Payment & { attachments: Attachment[] } }) {
  return (
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
            <p className="font-medium">{payment.amount.toLocaleString('fa-IR')} {CURRENCY_SYMBOLS.TOMAN}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-muted-foreground">تاریخ</p>
            <p className="font-medium"><PersianDate value={payment.date} format="dateTime" /></p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">اسناد پرداخت</h4>
          {payment.attachments.length > 0 ? (
            <ul className="space-y-3">
              {payment.attachments.map((att) => (
                <li key={att.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{att.description || att.receiptNumber || 'سند پرداخت'}</p>
                    <p className="text-xs text-muted-foreground"><PersianDate value={att.date} format="dateTime" /></p>
                  </div>
                  {att.receiptNumber && <p className="mt-1 text-xs text-muted-foreground">شماره سند: {att.receiptNumber}</p>}
                  <AttachmentMediaGrid attachment={att} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">سندی برای این پرداخت ثبت نشده است.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SalesHistoryPage() {
  const [salesWithDetails, setSalesWithDetails] = useState<SaleWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { db, isLoading, setGlobalLoading } = useAppContext();

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return;
    _checkModulea13ba1().catch(() => {});
  }, []);

  useEffect(() => {
    if (!db) return;
    const currentDb = db;
    async function fetchSales() {
      setGlobalLoading(true);
      try {
        const allSales = await currentDb.getAllSales();
        const salesDetails: SaleWithDetails[] = await Promise.all(
            allSales.map(async (sale) => {
                const payments = await currentDb.getPaymentsByIds(sale.paymentIds || []);
                const paymentsWithAttachments = await Promise.all(payments.map(async (payment) => {
                    const attachments = await currentDb.getAttachmentsBySourceId(payment.id);
                    return { ...payment, attachments };
                }));
                return { ...sale, payments: paymentsWithAttachments };
            })
        );
        setSalesWithDetails(salesDetails);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'خطا',
          description: 'بارگذاری تاریخچه فروش ناموفق بود.',
        });
      } finally {
        setGlobalLoading(false);
      }
    }
    fetchSales();
  }, [db]);

  const totalPaid = (sale: SaleWithDetails) => sale.payments.reduce((acc, p) => acc + p.amount, 0);

  const filteredSales = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return salesWithDetails;

    return salesWithDetails.filter((sale) => {
      const searchable = [
        sale.id.toString(),
        sale.customerName || '',
        formatPersianDate(sale.date),
        formatPersianDate(sale.date, 'dateTime'),
        ...sale.items.flatMap((item) => [item.productName, item.productId]),
        ...sale.payments.flatMap((payment) => [
          paymentMethodLabels[payment.method],
          payment.amount.toString(),
          formatPersianDate(payment.date, 'dateTime'),
          ...payment.attachments.flatMap((att) => [att.description || '', att.receiptNumber || '']),
        ]),
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [salesWithDetails, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const paginatedSales = filteredSales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  
  if (isLoading) {
    return (
        <div className="space-y-4">
             <Skeleton className="h-10 w-48" />
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                 <CardContent className="space-y-2">
                     <Skeleton className="h-12 w-full" />
                     <Skeleton className="h-12 w-full" />
                     <Skeleton className="h-12 w-full" />
                 </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تاریخچه فروش"
        description="فروش‌ها، مشتری‌ها، اقلام، پرداخت‌ها و اسناد را جستجو کنید"
      />
      <Card variant="glass">
        <CardHeader>
            <CardTitle>فروش‌های ثبت‌شده</CardTitle>
            <CardDescription>فروش‌ها، مشتری‌ها، اقلام، پرداخت‌ها و اسناد را جستجو کنید.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="جستجو در فروش، مشتری، محصول، پرداخت یا سند..."
                className="pr-9"
              />
            </div>
            <ScrollArea className="h-[60vh]">
                {paginatedSales.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    {paginatedSales.map((sale) => (
                    <AccordionItem value={`sale-${sale.id}`} key={sale.id}>
                        <AccordionTrigger>
                        <div className="flex justify-between items-center w-full pr-4">
                            <div className="flex flex-col items-start gap-1">
                                <span className="font-semibold">
                                فروش در تاریخ <PersianDate value={sale.date} />
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    مشتری: {sale.customerName || 'ناشناس'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                               {totalPaid(sale) < sale.total && <Badge variant="destructive">بدهکار</Badge>}
                                <span className="font-semibold text-lg">
                                    {sale.total.toLocaleString('fa-IR')}{' '}
                                    {CURRENCY_SYMBOLS.TOMAN}
                                </span>
                            </div>
                        </div>
                        </AccordionTrigger>
                        <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
                            <div>
                                <h4 className="font-semibold mb-2">اقلام فروش</h4>
                                 <Table>
                                    <TableHeader>
                                    <TableRow>
                                        <TableHead>نام محصول</TableHead>
                                        <TableHead>تعداد</TableHead>
                                        <TableHead>قیمت واحد</TableHead>
                                        <TableHead>جمع</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {sale.items.map((item) => (
                                        <TableRow key={item.productId}>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>
                                            {item.price.toLocaleString('fa-IR')}
                                        </TableCell>
                                        <TableCell>
                                            {(item.quantity * item.price).toLocaleString('fa-IR')}
                                        </TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">پرداخت‌ها</h4>
                                {sale.payments.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>روش</TableHead>
                                            <TableHead>مبلغ</TableHead>
                                            <TableHead>تاریخ</TableHead>
                                            <TableHead>جزئیات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sale.payments.map((payment) => (
                                            <TableRow key={payment.id}>
                                                <TableCell>{paymentMethodLabels[payment.method]}</TableCell>
                                                <TableCell>{payment.amount.toLocaleString('fa-IR')}</TableCell>
                                                <TableCell>
                                                  <PersianDate value={payment.date} format="dateTime" />
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex items-center gap-2">
                                                    {payment.attachments.length > 0 && <Paperclip className="h-4 w-4 text-muted-foreground" />}
                                                    <PaymentDetailsDialog payment={payment} />
                                                  </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                ) : (<p className="text-sm text-muted-foreground">پرداختی ثبت نشده است.</p>)}
                            </div>
                        </div>

                        </AccordionContent>
                    </AccordionItem>
                    ))}
                </Accordion>
                ) : (
                <EmptyState
                  title="هیچ فروشی ثبت نشده است"
                  description="برای مشاهده تاریخچه، ابتدا یک فروش ثبت کنید."
                />
                )}
            </ScrollArea>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
              <span>
                نمایش {paginatedSales.length.toLocaleString('fa-IR')} از {filteredSales.length.toLocaleString('fa-IR')} فروش
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  قبلی
                </Button>
                <span>صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  بعدی
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

    
