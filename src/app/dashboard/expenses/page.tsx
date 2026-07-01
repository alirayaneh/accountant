
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Receipt, Repeat, RefreshCw, Paperclip, Pencil, Loader2, Search } from 'lucide-react';
import type { Expense, RecurringExpense, RecurringExpenseFrequency, Attachment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/components/app-provider';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { _assertModule84d2e6 } from '@/lib/license/gates/expenses';
import { Skeleton } from '@/components/ui/skeleton';
import { PersianDate, PersianDatePicker } from '@/components/persian-date';
import { Badge } from '@/components/ui/badge';
import { formatPersianDate } from '@/lib/date-utils';

const PAGE_SIZE = 10;
type ExpenseTypeFilter = 'all' | 'one-time' | 'recurring';

const attachmentSchema = z.object({
  description: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptImage: z.string().optional(), // Base64
  date: z.string().min(1, 'تاریخ سند الزامی است'),
});

const expenseSchema = z.object({
  title: z.string().min(1, 'عنوان هزینه الزامی است'),
  amount: z.coerce.number().min(1, 'مبلغ باید بزرگتر از صفر باشد'),
  date: z.string().min(1, 'تاریخ هزینه الزامی است'),
});

const recurringExpenseSchema = z.object({
  title: z.string().min(1, 'عنوان هزینه الزامی است'),
  amount: z.coerce.number().min(1, 'مبلغ باید بزرگتر از صفر باشد'),
  frequency: z.enum(['monthly', 'yearly'], { required_error: 'دوره تکرار الزامی است' }),
  startDate: z.string().min(1, 'تاریخ شروع الزامی است'),
});


function AttachmentForm({ onAddAttachment }: { onAddAttachment: (data: z.infer<typeof attachmentSchema>) => void }) {
    const form = useForm<z.infer<typeof attachmentSchema>>({
        resolver: zodResolver(attachmentSchema),
        defaultValues: { description: '', receiptNumber: '', receiptImage: '', date: new Date().toISOString().slice(0, 16) },
    });
    
    const [preview, setPreview] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
                form.setValue('receiptImage', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (data: z.infer<typeof attachmentSchema>) => {
        onAddAttachment(data);
        form.reset({ description: '', receiptNumber: '', receiptImage: '', date: new Date().toISOString() });
        setPreview('');
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-4 border rounded-md">
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
                    name="receiptImage"
                    render={() => (
                        <FormItem>
                        <FormLabel>تصویر رسید (اختیاری)</FormLabel>
                        <FormControl>
                            <Input type="file" accept="image/*" onChange={handleFileChange} className="pt-2"/>
                        </FormControl>
                        </FormItem>
                    )}
                    />
                {preview && (
                    <div className="relative w-32 h-32">
                        <img src={preview} alt="پیش‌نمایش رسید" className="rounded-md object-cover w-full h-full" />
                        <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => { form.setValue('receiptImage', ''); setPreview(''); }}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                )}
                <DialogClose asChild>
                    <Button type="submit">افزودن سند</Button>
                </DialogClose>
            </form>
        </Form>
    );
}

function ExpenseForm({ onExpenseAdded, expenseToEdit, onExpenseUpdated }: { onExpenseAdded: () => void, expenseToEdit?: Expense & { attachments?: Attachment[]}, onExpenseUpdated?: () => void }) {
  const { toast } = useToast();
  const { db } = useAppContext();
  const [attachments, setAttachments] = useState<Partial<Attachment>[]>(expenseToEdit?.attachments || []);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<string[]>([]);
  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expenseToEdit ? {
        ...expenseToEdit,
        date: expenseToEdit.date
    } : { title: '', amount: 0, date: new Date().toISOString().slice(0, 16) },
  });

  const { formState: { isSubmitting } } = form;
  
  useEffect(() => {
    if (expenseToEdit) {
      setAttachments(expenseToEdit.attachments || []);
    }
  }, [expenseToEdit]);

  const handleAddAttachment = (data: z.infer<typeof attachmentSchema>) => {
      setAttachments([...attachments, { ...data, id: `new-${Date.now()}`}]);
  }
  
  const handleRemoveAttachment = (id: string) => {
      setAttachments(attachments.filter(att => att.id !== id));
      if(!id.startsWith('new-')) {
          setDeletedAttachmentIds([...deletedAttachmentIds, id]);
      }
  }

  const onSubmit = async (data: z.infer<typeof expenseSchema>) => {
    if (!db) return;
    try {
        const newAttachmentsData = attachments
            .filter(att => att.id?.startsWith('new-'))
            .map(({id, ...rest}) => rest) as Omit<Attachment, 'id'|'sourceId'|'sourceType'>[];

        if (expenseToEdit && onExpenseUpdated) {
            await db.updateExpense({ ...expenseToEdit, ...data}, newAttachmentsData, deletedAttachmentIds);
            toast({ title: 'موفق', description: 'هزینه با موفقیت بروزرسانی شد.' });
            onExpenseUpdated();
        } else {
            await db.addExpense({
                ...data,
            }, newAttachmentsData);
            toast({ title: 'موفق', description: 'هزینه جدید با موفقیت ثبت شد.' });
            form.reset();
            setAttachments([]);
            onExpenseAdded();
        }
    } catch (error) {
      console.error(error)
      toast({ variant: 'destructive', title: 'خطا', description: 'عملیات ناموفق بود.' });
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>{expenseToEdit ? 'ویرایش هزینه' : 'ثبت هزینه لحظه‌ای'}</CardTitle>
        <CardDescription>{expenseToEdit ? 'جزئیات هزینه را ویرایش کنید.' : 'هزینه‌های جاری و غیرتکراری خود را در این قسمت وارد کنید.'}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان هزینه</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: خرید ملزومات" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <FormLabel>تاریخ و ساعت هزینه</FormLabel>
                    <FormControl>
                        <PersianDatePicker includeTime value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <div className="space-y-4">
                <Label>اسناد پیوست</Label>
                <div className="space-y-2">
                    {attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-2 border rounded-md">
                            <span>{att.receiptNumber || att.description || 'سند بدون عنوان'}</span>
                             <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveAttachment(att.id!)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button type="button" variant="outline"><PlusCircle className="mr-2 h-4 w-4" />افزودن سند</Button>
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
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {isSubmitting ? "در حال ثبت..." : (expenseToEdit ? 'ذخیره تغییرات' : 'ثبت هزینه')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function RecurringExpenseForm({ onRecurringExpenseAdded }: { onRecurringExpenseAdded: () => void }) {
    const { toast } = useToast();
    const { db } = useAppContext();
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

    const fetchRecurringExpenses = async () => {
        if (!db) return;
        const expenses = await db.getAllRecurringExpenses();
        setRecurringExpenses(expenses);
    };

    useEffect(() => {
        if (db) {
            fetchRecurringExpenses();
        }
    }, [db]);

    const form = useForm<z.infer<typeof recurringExpenseSchema>>({
        resolver: zodResolver(recurringExpenseSchema),
        defaultValues: { title: '', amount: 0, startDate: new Date().toISOString().split('T')[0] },
    });
    
    const { formState: { isSubmitting } } = form;

    const onSubmit = async (data: z.infer<typeof recurringExpenseSchema>) => {
        if (!db) return;
        try {
        const newRecurringExpense: RecurringExpense = {
            id: Date.now().toString(),
            ...data,
            frequency: data.frequency as RecurringExpenseFrequency,
            startDate: new Date(data.startDate).toISOString(),
        };
        await db.addRecurringExpense(newRecurringExpense);
        toast({ title: 'موفق', description: 'هزینه دوره‌ای جدید تعریف شد.' });
        form.reset({ title: '', amount: 0, startDate: new Date().toISOString().split('T')[0] });
        fetchRecurringExpenses();
        onRecurringExpenseAdded();
        } catch (error) {
        toast({ variant: 'destructive', title: 'خطا', description: 'تعریف هزینه دوره‌ای ناموفق بود.' });
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!db) return;
        try {
            await db.deleteRecurringExpense(id);
            toast({ title: 'موفق', description: 'هزینه دوره‌ای حذف شد.' });
            fetchRecurringExpenses();
             onRecurringExpenseAdded();
        } catch (error) {
            toast({ variant: 'destructive', title: 'خطا', description: 'حذف هزینه دوره‌ای ناموفق بود.' });
        }
    };

    return (
        <Card variant="glass">
        <CardHeader>
            <CardTitle>تعریف هزینه دوره‌ای</CardTitle>
            <CardDescription>هزینه‌های ثابت مانند اجاره را تعریف کنید تا به طور خودکار ثبت شوند.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>عنوان هزینه</FormLabel>
                        <FormControl>
                            <Input placeholder="مثال: اجاره مغازه" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>مبلغ (تومان)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="10,000,000" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="frequency"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>دوره تکرار</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="انتخاب کنید" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="monthly">ماهانه</SelectItem>
                                    <SelectItem value="yearly">سالانه</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>تاریخ اولین پرداخت</FormLabel>
                            <FormControl>
                                <PersianDatePicker value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || !db}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    {isSubmitting ? "در حال افزودن..." : "افزودن هزینه دوره‌ای"}
                </Button>
            </form>
            </Form>
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">هزینه‌های دوره‌ای تعریف‌شده</h3>
                 {recurringExpenses.length > 0 ? (
                    <ul className="rounded-md border">
                        {recurringExpenses.map((item) => (
                        <li key={item.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
                            <div>
                                <p>{item.title} - {item.amount.toLocaleString('fa-IR')} تومان</p>
                                <p className="text-xs text-muted-foreground">
                                    تکرار: {item.frequency === 'monthly' ? 'ماهانه' : 'سالانه'} - 
                                    شروع از: <PersianDate value={item.startDate} />
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </li>
                        ))}
                    </ul>
                    ) : (
                    <p className="text-sm text-muted-foreground p-4 text-center">هنوز هزینه دوره‌ای تعریف نشده است.</p>
                    )}
            </div>
        </CardContent>
        </Card>
    );
}

function ExpenseListItem({ expense, onUpdate }: { expense: Expense & { attachments: Attachment[] }, onUpdate: () => void }) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const { db } = useAppContext();
    const { toast } = useToast();

     const handleDelete = async (id: string) => {
        if (!db) return;
        try {
            await db.deleteExpense(id);
            toast({
            title: 'هزینه حذف شد',
            description: 'هزینه با موفقیت حذف شد.',
            });
            onUpdate();
        } catch (error) {
            toast({
            variant: 'destructive',
            title: 'خطا',
            description: 'حذف هزینه ناموفق بود.',
            });
        }
    };

    return (
        <li className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-muted text-muted-foreground">
                    <Receipt className="h-5 w-5" />
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{expense.title}</p>
                        {expense.recurringExpenseId && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                                <Repeat className="h-3 w-3" />
                                دوره‌ای
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        <PersianDate value={expense.date} format="dateTime" />
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {expense.attachments && expense.attachments.length > 0 && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon"><Paperclip className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>اسناد پیوست: {expense.title}</DialogTitle>
                            </DialogHeader>
                            <ul className="space-y-2">
                                {expense.attachments.map(att => (
                                    <li key={att.id} className="border p-2 rounded-md">
                                        <p>{att.description || 'سند'}</p>
                                        <p className="text-xs text-muted-foreground"><PersianDate value={att.date} format="dateTime" /> - {att.receiptNumber}</p>
                                        {att.receiptImage && <img src={att.receiptImage} alt="رسید" className="mt-2 max-w-full h-auto rounded" />}
                                    </li>
                                ))}
                            </ul>
                        </DialogContent>
                    </Dialog>
                )}
                <span className="font-bold text-red-600">
                    {expense.amount.toLocaleString('fa-IR')} {CURRENCY_SYMBOLS.TOMAN}
                </span>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                         <DialogHeader>
                            <DialogTitle>ویرایش هزینه</DialogTitle>
                        </DialogHeader>
                        <ExpenseForm expenseToEdit={expense} onExpenseUpdated={() => {
                            onUpdate();
                            setIsEditDialogOpen(false);
                        }} onExpenseAdded={() => {}} />
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
                                این عملیات غیرقابل بازگشت است. هزینه '{expense.title}' برای همیشه حذف خواهد شد.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>لغو</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(expense.id)}>
                                حذف
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </li>
    );
}

export default function ExpensesPage() {
  const { db, isLoading, setGlobalLoading } = useAppContext();
  const [expenses, setExpenses] = useState<(Expense & { attachments: Attachment[] })[]>([]);
  const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExpenseTypeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return;
    _assertModule84d2e6().catch(() => {});
  }, []);

  const fetchExpenses = async () => {
    if (!db) return;
    setGlobalLoading(true);
    try {
        await db.applyRecurringExpenses();
        const allExpenses = await db.getAllExpenses();
        const expensesWithAttachments = await Promise.all(allExpenses.map(async (exp) => {
            const attachments = await db.getAttachmentsBySourceId(exp.id);
            return { ...exp, attachments };
        }));
        setExpenses(expensesWithAttachments);
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'خطا',
            description: 'بارگذاری لیست مخارج ناموفق بود.',
        });
    } finally {
        setGlobalLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return expenses.filter((expense) => {
      if (typeFilter === 'one-time' && expense.recurringExpenseId) return false;
      if (typeFilter === 'recurring' && !expense.recurringExpenseId) return false;

      if (dateFrom && new Date(expense.date) < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(expense.date) > to) return false;
      }

      if (!query) return true;

      const searchable = [
        expense.title,
        expense.amount.toString(),
        formatPersianDate(expense.date),
        formatPersianDate(expense.date, 'dateTime'),
        expense.recurringExpenseId ? 'دوره‌ای' : 'لحظه‌ای',
        ...expense.attachments.flatMap((att) => [att.description || '', att.receiptNumber || '']),
      ].join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [expenses, searchTerm, typeFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, dateFrom, dateTo]);
  
  const handleApplyRecurring = async () => {
      if (!db) return;
      setIsProcessingRecurring(true);
      try {
        const addedCount = await db.applyRecurringExpenses();
        if (addedCount > 0) {
            toast({
                title: 'هزینه‌های دوره‌ای اعمال شد',
                description: `${addedCount} هزینه دوره‌ای به طور خودکار به لیست مخارج اضافه شد.`,
            });
        } else {
             toast({
                title: 'به‌روز',
                description: 'هیچ هزینه دوره‌ای جدیدی برای ثبت وجود نداشت.',
            });
        }
        fetchExpenses();
      } catch (error) {
         console.error(error);
         toast({
            variant: 'destructive',
            title: 'خطا در پردازش',
            description: 'اعمال هزینه‌های دوره‌ای ناموفق بود.',
        });
      } finally {
          setIsProcessingRecurring(false);
      }
  }

  useEffect(() => {
    if (db) {
        fetchExpenses();
    }
  }, [db]);
  
   if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
        <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-[70vh] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="مخارج" description="ثبت هزینه‌های لحظه‌ای و دوره‌ای" />
    <div className="grid gap-8 md:grid-cols-3">
       <div className="md:col-span-1">
         <Tabs defaultValue="one-time">
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-white/5">
                <TabsTrigger value="one-time" className="rounded-lg"><Receipt className="ms-1 h-4 w-4" />لحظه‌ای</TabsTrigger>
                <TabsTrigger value="recurring" className="rounded-lg"><Repeat className="ms-1 h-4 w-4" />دوره‌ای</TabsTrigger>
            </TabsList>
            <TabsContent value="one-time">
                <ExpenseForm onExpenseAdded={fetchExpenses} onExpenseUpdated={fetchExpenses} />
            </TabsContent>
             <TabsContent value="recurring">
                <RecurringExpenseForm onRecurringExpenseAdded={fetchExpenses} />
            </TabsContent>
        </Tabs>
      </div>
      <div className="md:col-span-2">
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">لیست مخارج ثبت‌شده</h2>
            <Button 
              onClick={handleApplyRecurring} 
              variant="ghost-glass" 
              size="sm"
              className="flex items-center gap-2"
              disabled={isProcessingRecurring}
            >
              <RefreshCw className={`h-4 w-4 ${isProcessingRecurring ? 'animate-spin' : ''}`} />
              {isProcessingRecurring ? 'در حال پردازش...' : 'بررسی هزینه‌های دوره‌ای'}
            </Button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجو (عنوان، مبلغ، شماره سند...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ExpenseTypeFilter)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="نوع هزینه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="one-time">لحظه‌ای</SelectItem>
                <SelectItem value="recurring">دوره‌ای</SelectItem>
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
            {filteredExpenses.length.toLocaleString('fa-IR')} هزینه
            {filteredExpenses.length !== expenses.length &&
              ` (از ${expenses.length.toLocaleString('fa-IR')} کل)`}
            {' — '}
            جمع: {filteredExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString('fa-IR')} {CURRENCY_SYMBOLS.TOMAN}
          </p>
        </div>
        <Card variant="glass">
          <CardContent className="p-0">
             <ScrollArea className="h-[65vh]">
                {paginatedExpenses.length > 0 ? (
                <ul className="divide-y divide-border">
                    {paginatedExpenses.map((expense) => (
                       <ExpenseListItem key={expense.id} expense={expense} onUpdate={fetchExpenses} />
                    ))}
                </ul>
                ) : (
                <EmptyState
                  title={expenses.length === 0 ? 'هنوز هزینه‌ای ثبت نشده است' : 'هزینه‌ای یافت نشد'}
                  description={
                    expenses.length === 0
                      ? 'برای شروع، اولین هزینه خود را از فرم کنار صفحه ثبت کنید.'
                      : 'فیلترها یا عبارت جستجو را تغییر دهید.'
                  }
                  className="m-4 border-none bg-transparent"
                />
                )}
             </ScrollArea>
             {filteredExpenses.length > PAGE_SIZE && (
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
