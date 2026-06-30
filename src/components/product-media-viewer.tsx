'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ProductMedia } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductMediaViewerProps {
  media: ProductMedia[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
}

export function ProductMediaViewer({
  media,
  initialIndex = 0,
  open,
  onOpenChange,
  productName,
}: ProductMediaViewerProps) {
  const images = media.filter((m) => m.type === 'image');
  const [index, setIndex] = useState(initialIndex);

  const safeIndex = Math.min(index, Math.max(0, images.length - 1));
  const current = images[safeIndex];

  const goPrev = () => setIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  const goNext = () => setIndex((i) => (i < images.length - 1 ? i + 1 : 0));

  if (images.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto border-none bg-black/90 p-2 sm:p-4">
        <DialogTitle className="sr-only">
          {productName ? `تصویر ${productName}` : 'نمایش تصویر محصول'}
        </DialogTitle>
        <div className="relative flex min-h-[50vh] items-center justify-center">
          {images.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={goPrev}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
          {current && (
            <img
              src={current.url}
              alt={current.name || productName || 'محصول'}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
          )}
          {images.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={goNext}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
        </div>
        {images.length > 1 && (
          <p className="text-center text-sm text-white/70">
            {safeIndex + 1} / {images.length}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ProductMediaThumbProps {
  media: ProductMedia[];
  productName: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ProductMediaThumb({
  media,
  productName,
  className,
  onClick,
}: ProductMediaThumbProps) {
  const cover = media.find((m) => m.type === 'image') || media[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'overflow-hidden rounded-md bg-muted shrink-0',
        onClick && 'cursor-zoom-in',
        className
      )}
    >
      {cover?.type === 'image' ? (
        <img src={cover.url} alt={productName} className="h-full w-full object-cover" />
      ) : cover?.type === 'video' ? (
        <video src={cover.url} className="h-full w-full object-cover" muted />
      ) : null}
    </button>
  );
}
