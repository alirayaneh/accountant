
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Pencil, User } from 'lucide-react';
import type { Customer } from '@/lib/types';
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
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useAppContext } from '@/components/app-provider';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { _guardModule4423cf } from '@/lib/license/gates/customers';

const customerSchema = z.object({
  name: z.string().min(1, 'نام مشتری الزامی است'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

function CustomerForm({
  customer,
  onSuccess,
}: {
  customer?: Customer;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { db } = useAppContext();
  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {
      name: '',
      phone: '',
      address: '',
    },
  });

  const handleSubmit = async (data: z.infer<typeof customerSchema>) => {
    if (!db) return;
    try {
      if (customer) {
        await db.updateCustomer({ ...customer, ...data });
        toast({ title: 'موفق', description: 'اطلاعات مشتری به‌روزرسانی شد.' });
      } else {
        await db.addCustomer({ id: Date.now().toString(), ...data });
        toast({ title: 'موفق', description: 'مشتری جدید اضافه شد.' });
      }
      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'عملیات ناموفق بود.',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام مشتری</FormLabel>
              <FormControl>
                <Input placeholder="نام کامل مشتری" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>شماره موبایل</FormLabel>
              <FormControl>
                <Input placeholder="0912xxxxxxx" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>آدرس</FormLabel>
              <FormControl>
                <Textarea placeholder="آدرس کامل مشتری" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">لغو</Button>
          </DialogClose>
          <Button type="submit">{customer ? 'ذخیره تغییرات' : 'افزودن مشتری'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function CustomerCard({
  customer,
  onDelete,
  onUpdate,
}: {
  customer: Customer;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <Card variant="glass" className="transition-transform hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>{customer.name}</CardTitle>
            <CardDescription>{customer.phone || 'بدون شماره تماس'}</CardDescription>
          </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{customer.address || 'بدون آدرس'}</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ویرایش مشتری</DialogTitle>
            </DialogHeader>
            <CustomerForm
              customer={customer}
              onSuccess={() => {
                onUpdate();
                setIsEditDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>آیا مطمئن هستید؟</AlertDialogTitle>
              <AlertDialogDescription>
                این عملیات غیرقابل بازگشت است. مشتری '{customer.name}' برای همیشه حذف خواهد شد.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>لغو</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(customer.id)}>
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const { db } = useAppContext();

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return;
    _guardModule4423cf().catch(() => {});
  }, []);

  const fetchCustomers = async () => {
    if (!db) return;
    try {
      const allCustomers = await db.getAllCustomers();
      setCustomers(allCustomers.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'بارگذاری لیست مشتریان ناموفق بود.',
      });
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [db]);

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await db.deleteCustomer(id);
      toast({
        title: 'مشتری حذف شد',
        description: 'مشتری با موفقیت حذف شد.',
      });
      fetchCustomers();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'حذف مشتری ناموفق بود.',
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مدیریت مشتریان"
        description="افزودن، ویرایش و حذف مشتریان"
        actions={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <PlusCircle className="me-2 h-4 w-4" />
                افزودن مشتری
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>افزودن مشتری جدید</DialogTitle>
              </DialogHeader>
              <CustomerForm
                onSuccess={() => {
                  fetchCustomers();
                  setIsAddDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {customers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onDelete={handleDelete}
              onUpdate={fetchCustomers}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="مشتری یافت نشد"
          description="برای شروع، اولین مشتری خود را اضافه کنید."
          action={
            <Button variant="gradient" onClick={() => setIsAddDialogOpen(true)}>
              افزودن مشتری
            </Button>
          }
        />
      )}
    </div>
  );
}
