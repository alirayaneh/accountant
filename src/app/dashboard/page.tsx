
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  FileText,
  ShoppingCart,
  PlusCircle,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import type { Product, Sale, Expense } from '@/lib/types';
import { useAppContext } from '@/components/app-provider';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DataSection } from '@/components/ui/data-section';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatToman } from '@/lib/format';
import { startOfMonth, subDays } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatPersianDate } from '@/lib/date-utils';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { _ensureModuleface20 } from '@/lib/license/gates/dashboard';

export default function FinancialDashboardPage() {
  const { db, isLoading, setGlobalLoading } = useAppContext();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return;
    _ensureModuleface20().catch(() => {});
  }, []);

  useEffect(() => {
    if (!db) return;
    const currentDb = db;
    async function fetchData() {
      setGlobalLoading(true);
      try {
        await currentDb.applyRecurringExpenses();
        const [allSales, allExpenses, allProducts] = await Promise.all([
          currentDb.getAllSales(),
          currentDb.getAllExpenses(),
          currentDb.getAllProducts(),
        ]);
        const paymentIds = allSales.flatMap((s) => s.paymentIds || []);
        await currentDb.getPaymentsByIds(paymentIds);
        setSales(allSales);
        setExpenses(allExpenses);
        setProducts(allProducts);
      } catch {
        toast({
          variant: 'destructive',
          title: 'خطا در بارگذاری',
          description: 'بارگذاری داده‌های داشبورد با مشکل مواجه شد.',
        });
      } finally {
        setGlobalLoading(false);
      }
    }
    fetchData();
  }, [db]);

  const monthStart = startOfMonth(new Date());

  const monthSales = useMemo(
    () => sales.filter((s) => new Date(s.date) >= monthStart),
    [sales, monthStart]
  );
  const monthExpenses = useMemo(
    () => expenses.filter((e) => new Date(e.date) >= monthStart),
    [expenses, monthStart]
  );

  const { totalSales, totalExpenses, netProfit, invoiceCount } = useMemo(() => {
    const revenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    const grossProfit = monthSales.reduce((total, sale) => {
      const cost = sale.items.reduce((acc, item) => acc + (item.totalCost || 0), 0);
      return total + (sale.total - cost);
    }, 0);
    const expSum = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      totalSales: revenue,
      totalExpenses: expSum,
      netProfit: grossProfit - expSum,
      invoiceCount: monthSales.length,
    };
  }, [monthSales, monthExpenses]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.quantity <= p.lowStockThreshold),
    [products]
  );

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = d.toISOString().slice(0, 10);
      const daySales = sales.filter((s) => s.date.slice(0, 10) === key);
      const dayExpenses = expenses.filter((e) => e.date.slice(0, 10) === key);
      return {
        name: formatPersianDate(d, 'date'),
        فروش: daySales.reduce((sum, s) => sum + s.total, 0),
        مخارج: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
      };
    });
    return days;
  }, [sales, expenses]);

  const recentSales = useMemo(
    () => [...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [sales]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="داشبورد مالی"
        description="نمای کلی عملکرد ماه جاری"
        actions={
          <Button asChild variant="gradient">
            <Link href="/dashboard/record-sale">
              <ShoppingCart className="me-2 h-4 w-4" />
              ثبت فروش
            </Link>
          </Button>
        }
      />

      {lowStockProducts.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-sm">
            <strong>{lowStockProducts.length}</strong> محصول با موجودی کم —
            <Link href="/dashboard/inventory" className="ms-1 text-primary hover:underline">
              مشاهده موجودی
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="فروش ماه جاری" value={formatToman(totalSales)} icon={TrendingUp} />
        <StatCard label="مخارج ماه جاری" value={formatToman(totalExpenses)} icon={Receipt} />
        <StatCard
          label="سود خالص"
          value={formatToman(netProfit)}
          icon={TrendingUp}
          trend={netProfit >= 0 ? 'مثبت' : 'منفی'}
          trendUp={netProfit >= 0}
        />
        <StatCard label="تعداد فاکتور" value={invoiceCount.toLocaleString('fa-IR')} icon={FileText} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <DataSection title="فروش ۷ روز اخیر" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => v.toLocaleString('fa-IR')} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '12px',
                  direction: 'rtl',
                }}
                formatter={(value: number) => [formatToman(value), '']}
              />
              <Bar dataKey="فروش" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="مخارج" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DataSection>

        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">دسترسی سریع</h3>
          {[
            { href: '/dashboard/record-sale', label: 'ثبت فروش', icon: ShoppingCart },
            { href: '/dashboard/add-product', label: 'افزودن محصول', icon: PlusCircle },
            { href: '/dashboard/expenses', label: 'ثبت مخارج', icon: Receipt },
            { href: '/dashboard/reports', label: 'گزارش‌ها', icon: FileText },
          ].map(({ href, label, icon: Icon }) => (
            <Button key={href} asChild variant="ghost-glass" className="justify-between">
              <Link href={href}>
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <DataSection title="آخرین فروش‌ها" description="۸ فاکتور اخیر">
        {recentSales.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>مشتری</TableHead>
                <TableHead>اقلام</TableHead>
                <TableHead>مبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{formatPersianDate(new Date(sale.date), 'date')}</TableCell>
                  <TableCell>{sale.customerName || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="chip">{sale.items.length} قلم</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums font-medium text-primary">
                    {formatToman(sale.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">هنوز فروشی ثبت نشده است.</p>
        )}
      </DataSection>
    </div>
  );
}
