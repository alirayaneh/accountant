
'use client';

import { useRef, useEffect, useState } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Barcode, PlusCircle, Trash2, Loader2 } from 'lucide-react';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Product, CostTitle, ExchangeRate, ProductCost } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { calculateSellingPrice, CURRENCY_SYMBOLS, calculateTotalCostInToman } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/components/app-provider';
import Link from 'next/link';
import { ProductMediaManager } from '@/components/product-media-manager';
import { PageHeader } from '@/components/layout/page-header';
import { withLegacyImageUrl } from '@/lib/product-media';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { _ensureModulee463bc } from '@/lib/license/gates/add-product';

const mediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  type: z.enum(['image', 'video']),
  name: z.string().optional(),
});

const productSchema = z.object({
  id: z.string().min(1, 'بارکد الزامی است'),
  name: z.string().min(1, 'نام محصول الزامی است'),
  quantity: z.coerce.number().min(0, 'تعداد نمی‌تواند منفی باشد'),
  lowStockThreshold: z.coerce.number().min(0, 'آستانه نمی‌تواند منفی باشد'),
  profitMargin: z.coerce.number().min(0, 'حاشیه سود نمی‌تواند منفی باشد'),
  imageUrl: z.string().optional(),
  media: z.array(mediaSchema).default([]),
  costs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      amount: z.coerce.number().min(0, 'مبلغ نمی‌تواند منفی باشد'),
      currency: z.enum(['TOMAN', 'USD', 'AED', 'CNY']),
    })
  ),
});

export default function AddProductPage() {
  const barcodeRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [costTitles, setCostTitles] = useState<CostTitle[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const { db } = useAppContext();

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return;
    _ensureModulee463bc().catch(() => {});
  }, []);

  useEffect(() => {
    barcodeRef.current?.focus();
    async function fetchData() {
        if (!db) return;
      const [titles, rates] = await Promise.all([db.getCostTitles(), db.getExchangeRates()]);
      setCostTitles(titles);
      setExchangeRates(rates);
    }
    fetchData();
  }, [db]);

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: '',
      name: '',
      quantity: 0,
      lowStockThreshold: 10,
      profitMargin: 20,
      costs: [],
      imageUrl: '',
      media: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'costs',
  });
  
  const watchedValues = form.watch();

  useEffect(() => {
    const productData = {
        ...watchedValues,
        price: 0 // price is calculated, not a form field
    } as Product
    const newPrice = calculateSellingPrice(productData, exchangeRates);
    setCalculatedPrice(newPrice);
  }, [watchedValues, exchangeRates]);

  const onSubmit: SubmitHandler<z.infer<typeof productSchema>> = async (data) => {
    if (!db) return;
    try {
      const existingProduct = await db.getProductById(data.id);
      if (existingProduct) {
        toast({
          variant: 'destructive',
          title: 'محصول موجود است',
          description: `محصولی با بارکد ${data.id} از قبل موجود است.`,
        });
        return;
      }
      
      const finalPrice = calculateSellingPrice({...data, price: 0} as Product, exchangeRates);

      const newProduct: Product = withLegacyImageUrl({
        ...data,
        price: finalPrice,
      });

      await db.addProduct(newProduct);

      toast({
        title: 'محصول اضافه شد',
        description: `'${data.name}' به موجودی شما اضافه شد.`,
      });
      form.reset();
      barcodeRef.current?.focus();
      router.push(`/dashboard`);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'افزودن محصول ناموفق بود. لطفا دوباره تلاش کنید.',
      });
    }
  };

  const totalCost = calculateTotalCostInToman(watchedValues.costs as ProductCost[], exchangeRates);
  const media = form.watch('media') || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="افزودن محصول"
        description="جزئیات محصول و هزینه‌های مربوط به آن را وارد کنید"
      />
    <div className="grid gap-8 lg:grid-cols-3">
      <Card variant="glass" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>اطلاعات محصول</CardTitle>
          <CardDescription>
            بارکد، نام، موجودی و هزینه‌ها
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Core Product Details */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>بارکد (شناسه)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            placeholder="بارکد را اسکن یا وارد کنید"
                            {...field}
                            ref={barcodeRef}
                            className="pl-10"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نام محصول</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: سیب ارگانیک" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تعداد اولیه</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lowStockThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>آستانه موجودی کم</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Media Upload Section */}
              <div className="space-y-2">
                 <FormLabel>تصاویر و ویدئوهای محصول</FormLabel>
                 <FormDescription>
                    می‌توانید چند تصویر یا ویدئو برای محصول اضافه کنید.
                 </FormDescription>
                 <FormField
                    control={form.control}
                    name="media"
                    render={() => (
                        <FormItem>
                        <FormControl>
                            <ProductMediaManager
                              value={media}
                              onChange={(value) => form.setValue('media', value, { shouldDirty: true })}
                              uploadFile={(file) => db!.uploadFile(file)}
                            />
                        </FormControl>
                         <FormMessage />
                        </FormItem>
                    )}
                  />
              </div>


              <Separator />

              {/* Costs Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">هزینه‌های محصول</h3>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md">
                     <FormField
                        control={form.control}
                        name={`costs.${index}.title`}
                        render={({ field: selectField }) => (
                           <FormItem className="w-1/3">
                                <FormLabel>عنوان هزینه</FormLabel>
                                <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="یک عنوان انتخاب کنید" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {costTitles.map(ct => (
                                        <SelectItem key={ct.id} value={ct.title}>{ct.title}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                      control={form.control}
                      name={`costs.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="w-1/3">
                          <FormLabel>مبلغ</FormLabel>
                          <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`costs.${index}.currency`}
                      render={({ field }) => (
                        <FormItem className="w-1/3">
                          <FormLabel>ارز</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="ارز را انتخاب کنید" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                                <SelectItem key={code} value={code}>{code} ({symbol})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ id: Date.now().toString(), title: costTitles[0]?.title || '', amount: 0, currency: 'TOMAN' })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> افزودن هزینه
                </Button>
                {costTitles.length === 0 && (
                    <FormDescription>
                        هنوز هیچ عنوان هزینه‌ای تعریف نکرده‌اید. لطفا در <Link href={`/dashboard/settings`} className="underline">صفحه تنظیمات</Link> اضافه کنید.
                    </FormDescription>
                )}
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="profitMargin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حاشیه سود (%)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" variant="gradient" disabled={form.formState.isSubmitting || !db}>
                {form.formState.isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <PlusCircle className="me-2 h-4 w-4" />}
                {form.formState.isSubmitting ? "در حال افزودن..." : "افزودن محصول"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card variant="glass" className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>پیش‌نمایش قیمت</CardTitle>
          <CardDescription>محاسبه لحظه‌ای بر اساس هزینه‌ها</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">قیمت فروش محاسبه‌شده</p>
            <p className="tabular-nums text-3xl font-bold text-primary">
              {calculatedPrice.toLocaleString('fa-IR')} {CURRENCY_SYMBOLS.TOMAN}
            </p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>هزینه تمام‌شده: {totalCost.toLocaleString('fa-IR')} تومان</p>
            <p>حاشیه سود: {watchedValues.profitMargin}٪</p>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
