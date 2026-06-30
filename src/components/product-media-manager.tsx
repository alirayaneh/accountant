'use client';

import { Image as ImageIcon, Film, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ProductMedia } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type ProductMediaManagerProps = {
  value: ProductMedia[];
  onChange: (value: ProductMedia[]) => void;
  uploadFile: (file: File) => Promise<string>;
};

export function ProductMediaManager({ value, onChange, uploadFile }: ProductMediaManagerProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || isUploading) return;

    try {
      setIsUploading(true);
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const url = await uploadFile(file);
          const media: ProductMedia = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            name: file.name,
          };
          return media;
        })
      );
      onChange([...value, ...uploaded]);
      event.target.value = '';
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'خطا در آپلود فایل',
        description: 'آپلود تصویر یا ویدئو ناموفق بود.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeItem = (id: string) => {
    onChange(value.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((item) => (
          <div key={item.id} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
            {item.type === 'video' ? (
              <video src={item.url} className="h-full w-full object-cover" controls />
            ) : (
              <img src={item.url} alt={item.name || 'تصویر محصول'} className="h-full w-full object-cover" />
            )}
            <div className="absolute right-1 top-1 rounded bg-background/85 px-1.5 py-1 text-muted-foreground">
              {item.type === 'video' ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            </div>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute left-1 top-1 h-7 w-7"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed bg-muted text-muted-foreground hover:bg-card">
          <PlusCircle className="mb-2 h-7 w-7" />
          <span className="text-xs">{isUploading ? 'در حال آپلود...' : 'افزودن رسانه'}</span>
          <Input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} disabled={isUploading} />
        </label>
      </div>
    </div>
  );
}
