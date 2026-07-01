
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Sale, Expense, Payment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/components/app-provider';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3 } from 'lucide-react';
import { formatPersianDate } from '@/lib/date-utils';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatToman } from '@/lib/format';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { _ensureModule54f2e7 } from '@/lib/license/gates/reports';

type TimeRange = 'all' | 'last_year' | 'this_year' | 'last_month' | 'this_month' | 'last_week' | 'this_week';

type ChartData = {
  name: string;
  sortKey: string;
  فروش: number;
  'سود ناخالص': number;
  مخارج: number;
  'سود خالص': number;
};

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const { toast } = useToast();
  const { db, isLoading, setGlobalLoading } = useAppContext();
  const [timeRange, setTimeRange] = useState<TimeRange>('this_month');

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return;
    _ensureModule54f2e7().catch(() => {});
  }, []);

  useEffect(() => {
    if (!db) return;
    const currentDb = db;
    async function fetchData() {
      setGlobalLoading(true);
      try {
        await currentDb.applyRecurringExpenses();
        const [allSales, allExpenses] = await Promise.all([currentDb.getAllSales(), currentDb.getAllExpenses()]);
        const paymentIds = allSales.flatMap(s => s.paymentIds || []);
        const allPayments = await currentDb.getPaymentsByIds(paymentIds);
        setSales(allSales);
        setExpenses(allExpenses);
        setPayments(allPayments);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'خطا در بارگذاری داده',
          description: 'بارگذاری اطلاعات فروش و مخارج با مشکل مواجه شد.',
        });
      } finally {
        setGlobalLoading(false);
      }
    }
    fetchData();
  }, [db]);

  const { filteredSales, filteredExpenses } = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let isAll = false;

    switch (timeRange) {
      case 'this_week':
        startDate = startOfWeek(now);
        break;
      case 'last_week':
        startDate = startOfWeek(subDays(now, 7));
        endDate = endOfWeek(subDays(now, 7));
        break;
      case 'this_month':
        startDate = startOfMonth(now);
        break;
      case 'last_month':
        startDate = startOfMonth(subDays(now, 30));
        endDate = endOfMonth(subDays(now, 30));
        break;
      case 'this_year':
        startDate = startOfYear(now);
        break;
      case 'last_year':
        startDate = startOfYear(subDays(now, 365));
        endDate = endOfYear(subDays(now, 365));
        break;
      case 'all':
      default:
        isAll = true;
        startDate = new Date(0);
        endDate = new Date();
        break;
    }

    const filterByDate = <T extends { date: string }>(items: T[]) => {
      if (isAll) return items;
      return items.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
    };

    return {
      filteredSales: filterByDate(sales),
      filteredExpenses: filterByDate(expenses),
    };
  }, [sales, expenses, timeRange]);

  const chartData = useMemo<ChartData[]>(() => {
    if (filteredSales.length === 0 && filteredExpenses.length === 0) return [];

    const dataMap = new Map<string, { فروش: number, 'سود ناخالص': number, مخارج: number }>();

    let useMonthBuckets = false;
    if (timeRange === 'this_year' || timeRange === 'last_year' || (timeRange === 'all' && (sales.length > 30 || expenses.length > 30))) {
        useMonthBuckets = true;
    }

    const getDateKey = (value: string) => {
      const date = new Date(value);
      return useMonthBuckets
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().slice(0, 10);
    };

    const getDateLabel = (key: string) => {
      const date = useMonthBuckets ? new Date(`${key}-01T00:00:00`) : new Date(`${key}T00:00:00`);
      return formatPersianDate(date, useMonthBuckets ? 'month' : 'date');
    };

    filteredSales.forEach(sale => {
      const dateKey = getDateKey(sale.date);
      const saleItemsCost = sale.items.reduce((acc, item) => acc + (item.totalCost || 0), 0);
      const saleGrossProfit = sale.total - saleItemsCost;

      const current = dataMap.get(dateKey) || { فروش: 0, 'سود ناخالص': 0, مخارج: 0 };
      current.فروش += sale.total;
      current['سود ناخالص'] += saleGrossProfit;
      dataMap.set(dateKey, current);
    });

    filteredExpenses.forEach(expense => {
      const dateKey = getDateKey(expense.date);
      const current = dataMap.get(dateKey) || { فروش: 0, 'سود ناخالص': 0, مخارج: 0 };
      current.مخارج += expense.amount;
      dataMap.set(dateKey, current);
    });

    return Array.from(dataMap.entries())
        .map(([name, values]) => ({
            name: getDateLabel(name),
            sortKey: name,
            ...values,
            'سود خالص': values['سود ناخالص'] - values.مخارج,
        }))
        .sort((a,b) => a.sortKey.localeCompare(b.sortKey));

  }, [filteredSales, filteredExpenses, timeRange, sales, expenses]);

  const { totalSales, totalGrossProfit, totalExpenses, totalNetProfit, totalReceivables } = useMemo(() => {
    const grossProfit = filteredSales.reduce((total, sale) => {
        const saleItemsCost = sale.items.reduce((acc, item) => acc + (item.totalCost || 0), 0);
        return total + (sale.total - saleItemsCost);
    }, 0);
    const expensesSum = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalPaid = filteredSales.reduce((total, sale) => {
        const salePayments = payments.filter(p => (sale.paymentIds || []).includes(p.id));
        return total + salePayments.reduce((sum, p) => sum + p.amount, 0);
    }, 0);
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

    return {
        totalSales: totalRevenue,
        totalGrossProfit: grossProfit,
        totalExpenses: expensesSum,
        totalNetProfit: grossProfit - expensesSum,
        totalReceivables: totalRevenue - totalPaid,
    };
  }, [filteredSales, filteredExpenses, payments]);

  const renderChart = (data: ChartData[], title: string) => (
     <Card variant="glass">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => value.toLocaleString('fa-IR')} />
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            direction: 'rtl',
                        }}
                         formatter={(value: number, name: string) => [value.toLocaleString('fa-IR'), name]}
                    />
                    <Legend />
                    <Bar dataKey="فروش" fill="hsl(var(--primary))" />
                    <Bar dataKey="سود خالص" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="مخارج" fill="hsl(var(--destructive))" />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
  );

  const timeRangeLabels: Record<TimeRange, string> = {
    this_week: 'هفته جاری',
    last_week: 'هفته گذشته',
    this_month: 'ماه جاری',
    last_month: 'ماه گذشته',
    this_year: 'سال جاری',
    last_year: 'سال گذشته',
    all: 'کل بازه',
  }

  if (isLoading) {
    return (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-96 w-full lg:col-span-5" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="گزارش‌ها"
        description="تحلیل فروش، سود و مخارج در بازه زمانی"
        actions={
          <div className="w-48">
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger>
                    <SelectValue placeholder="انتخاب بازه زمانی" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(timeRangeLabels).map(([key, label]) => (
                         <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        }
      />
        {sales.length > 0 || expenses.length > 0 ? (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard label="مجموع فروش" value={formatToman(totalSales)} icon={BarChart3} />
                <StatCard label="سود ناخالص" value={formatToman(totalGrossProfit)} />
                <StatCard label="مجموع مخارج" value={formatToman(totalExpenses)} />
                <StatCard label="سود خالص" value={formatToman(totalNetProfit)} trend={totalNetProfit >= 0 ? 'مثبت' : 'منفی'} trendUp={totalNetProfit >= 0} />
                <StatCard label="مطالبات" value={formatToman(totalReceivables)} />
            </div>
             <div className="grid gap-8">
                {renderChart(chartData, 'نمودار جامع فروش، سود و مخارج')}
            </div>
        </>
        ) : (
            <EmptyState
              title="داده‌ای برای نمایش وجود ندارد"
              description="هیچ فروش یا هزینه‌ای در بازه زمانی انتخاب شده ثبت نشده است."
            />
        )}
    </div>
  );
}
