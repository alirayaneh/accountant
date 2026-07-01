
'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/components/app-provider';
import type { Product, Sale, ExchangeRate } from '@/lib/types';
import { ImageIcon, ShoppingBag, TrendingUp, DollarSign } from 'lucide-react';
import { getEffectiveProductPrice } from '@/lib/utils';
import { ProductMediaViewer } from '@/components/product-media-viewer';
import { PersianDate } from '@/components/persian-date';
import { getProductCover, getProductMedia } from '@/lib/product-media';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { formatToman } from '@/lib/format';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { _validateModule12b00e } from '@/lib/license/gates/products-detail';

function ProductProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const { db, setGlobalLoading, isLoading } = useAppContext();

  const [product, setProduct] = useState<Product | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!IS_ELECTRON_BUILD) return;
    _validateModule12b00e().catch(() => {});
  }, []);

  useEffect(() => {
    if (!db || !id) return;

    const fetchProductData = async () => {
      setGlobalLoading(true);
      try {
        const [productData, allSales, rates] = await Promise.all([
          db.getProductById(id),
          db.getAllSales(),
          db.getExchangeRates(),
        ]);
        if (!productData) {
          router.push('/dashboard');
          return;
        }
        setProduct(productData);
        setExchangeRates(rates);

        const productSales = allSales.filter(sale =>
          sale.items.some(item => item.productId === id)
        );
        setSales(productSales);
      } catch (error) {
        console.error('Failed to fetch product data:', error);
      } finally {
        setGlobalLoading(false);
      }
    };

    fetchProductData();
  }, [db, id, router, setGlobalLoading]);

  const stats = useMemo(() => {
    if (!product) return { totalSold: 0, totalRevenue: 0, grossProfit: 0 };

    let totalSoldCount = 0;
    let totalRevenue = 0;
    let grossProfit = 0;

    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.productId === product.id) {
          totalSoldCount += item.quantity;
          totalRevenue += item.quantity * item.price;
          grossProfit += (item.quantity * item.price) - item.totalCost;
        }
      });
    });

    return { totalSold: totalSoldCount, totalRevenue, grossProfit };
  }, [product, sales]);

  if (!id) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isLoading || !product) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const media = getProductMedia(product);
  const cover = getProductCover(product);
  const effectivePrice = getEffectiveProductPrice(product, exchangeRates);
  const imageMedia = media.filter((m) => m.type === 'image');

  return (
    <div className="space-y-6">
      <PageHeader title={product.name} description={`بارکد: ${product.id}`} />

      <header className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-card/60 p-6 backdrop-blur-xl md:flex-row">
        {cover?.type === 'image' ? (
            <button type="button" className="cursor-zoom-in" onClick={() => setLightboxIndex(0)}>
              <img src={cover.url} alt={product.name} className="rounded-lg object-cover w-32 h-32" />
            </button>
        ) : cover?.type === 'video' ? (
            <video src={cover.url} controls className="rounded-lg object-cover w-32 h-32 bg-muted" />
        ) : (
            <div className="flex items-center justify-center w-32 h-32 bg-muted rounded-lg shrink-0">
                <ImageIcon className="w-16 h-16 text-muted-foreground" />
            </div>
        )}
        <div className="flex-1">
          <p className="text-muted-foreground">قیمت فروش: {formatToman(effectivePrice)}</p>
        </div>
      </header>

      {media.length > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>رسانه‌های محصول</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {media.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className="aspect-square overflow-hidden rounded-md border bg-muted cursor-zoom-in"
                  onClick={() => item.type === 'image' && setLightboxIndex(imageMedia.findIndex((m) => m.id === item.id))}
                >
                  {item.type === 'video' ? (
                    <video src={item.url} controls className="h-full w-full object-cover" />
                  ) : (
                    <img src={item.url} alt={item.name || product.name} className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ProductMediaViewer
        media={media}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onOpenChange={(open) => !open && setLightboxIndex(null)}
        productName={product.name}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="تعداد کل فروش" value={`${stats.totalSold.toLocaleString('fa-IR')} عدد`} icon={ShoppingBag} />
        <StatCard label="درآمد ناخالص" value={formatToman(stats.totalRevenue)} icon={DollarSign} />
        <StatCard label="سود ناخالص" value={formatToman(stats.grossProfit)} icon={TrendingUp} trendUp={stats.grossProfit >= 0} />
      </div>

      <Card variant="glass">
          <CardHeader>
              <CardTitle>تاریخچه فروش</CardTitle>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>تاریخ</TableHead>
                          <TableHead>مشتری</TableHead>
                          <TableHead>تعداد</TableHead>
                          <TableHead>قیمت فروش (واحد)</TableHead>
                          <TableHead>جمع کل</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {sales.length > 0 ? sales.map(sale => {
                        const item = sale.items.find(i => i.productId === product.id);
                        if (!item) return null;
                        return (
                           <TableRow key={sale.id}>
                              <TableCell><PersianDate value={sale.date} /></TableCell>
                              <TableCell>{sale.customerName || 'ناشناس'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{item.price.toLocaleString('fa-IR')}</TableCell>
                              <TableCell>{(item.quantity * item.price).toLocaleString('fa-IR')}</TableCell>
                          </TableRow>
                        )
                      }) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                               هیچ سابقه فروشی برای این محصول یافت نشد.
                            </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

    </div>
  );
}

export default function ProductProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ProductProfileContent />
    </Suspense>
  );
}
