import type { Product, ProductMedia } from '@/lib/types';

const normalizeMedia = (media: unknown): ProductMedia[] => {
  if (Array.isArray(media)) return media;
  if (typeof media === 'string') {
    try {
      const parsed = JSON.parse(media);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const getProductMedia = (product: Pick<Product, 'imageUrl' | 'media'>): ProductMedia[] => {
  const media = normalizeMedia(product.media);
  if (media.length > 0) return media;
  if (!product.imageUrl) return [];
  return [{ id: 'legacy-image', url: product.imageUrl, type: 'image', name: 'تصویر محصول' }];
};

export const getProductCover = (product: Pick<Product, 'imageUrl' | 'media'>) => {
  const media = getProductMedia(product);
  return media.find((item) => item.type === 'image') || media[0];
};

export const withLegacyImageUrl = <T extends { media?: ProductMedia[]; imageUrl?: string }>(product: T): T => {
  const coverImage = normalizeMedia(product.media).find((item) => item.type === 'image');
  return {
    ...product,
    imageUrl: coverImage?.url || product.imageUrl || '',
  };
};
