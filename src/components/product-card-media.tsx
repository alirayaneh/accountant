'use client';

import { useMemo, useState } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { ImageIcon, Film } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { ProductMediaViewer } from '@/components/product-media-viewer';
import { getProductMedia } from '@/lib/product-media';
import type { Product } from '@/lib/types';

interface ProductCardMediaProps {
  product: Product;
  className?: string;
}

export function ProductCardMedia({ product, className }: ProductCardMediaProps) {
  const media = getProductMedia(product);
  const images = media.filter((m) => m.type === 'image');
  const videos = media.filter((m) => m.type === 'video');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const autoplayPlugin = useMemo(
    () =>
      Autoplay({
        delay: 4000,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    []
  );

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (images.length > 1) {
    return (
      <>
        <div
          className={className}
          onMouseEnter={() => {}}
        >
          <Carousel
            opts={{ loop: true }}
            plugins={[autoplayPlugin]}
            className="w-full"
          >
            <CarouselContent>
              {images.map((item, idx) => (
                <CarouselItem key={item.id}>
                  <button
                    type="button"
                    className="relative block h-40 w-full cursor-zoom-in"
                    onClick={() => openLightbox(idx)}
                  >
                    <img
                      src={item.url}
                      alt={item.name || product.name}
                      className="h-full w-full rounded-t-lg object-cover"
                    />
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
        <ProductMediaViewer
          media={media}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          productName={product.name}
        />
      </>
    );
  }

  if (images.length === 1) {
    return (
      <>
        <button
          type="button"
          className={`relative w-full h-40 cursor-zoom-in ${className || ''}`}
          onClick={() => openLightbox(0)}
        >
          <img
            src={images[0].url}
            alt={product.name}
            className="h-full w-full rounded-t-lg object-cover"
          />
        </button>
        <ProductMediaViewer
          media={media}
          initialIndex={0}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          productName={product.name}
        />
      </>
    );
  }

  if (videos.length > 0) {
    return (
      <div className={`relative h-40 bg-muted ${className || ''}`}>
        <video
          src={videos[0].url}
          className="h-full w-full rounded-t-lg object-cover"
          controls
        />
        <div className="absolute right-2 top-2 rounded bg-background/85 p-1 text-muted-foreground">
          <Film className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center h-40 bg-muted rounded-t-lg ${className || ''}`}>
      <ImageIcon className="w-12 h-12 text-muted-foreground" />
    </div>
  );
}
