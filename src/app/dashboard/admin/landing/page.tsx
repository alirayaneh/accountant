'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/components/app-provider';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { LandingContact, LandingPost, LandingPostLink } from '@/lib/types';
import { toUploadPath } from '@/lib/landing-media';
import { Film, Image as ImageIcon, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

const EMPTY_CONTACT: LandingContact = {
  type: 'telegram',
  label: 'تلگرام',
  value: '',
};

type PostFormState = {
  title: string;
  description: string;
  badge: string;
  previewUrl: string;
  previewType: 'image' | 'video';
  body: string;
  bodyMediaUrl: string;
  bodyMediaType: '' | 'image' | 'video';
  tagsText: string;
  links: LandingPostLink[];
  sortOrder: number;
  isPublished: boolean;
};

const emptyPostForm = (): PostFormState => ({
  title: '',
  description: '',
  badge: '',
  previewUrl: '',
  previewType: 'image',
  body: '',
  bodyMediaUrl: '',
  bodyMediaType: '',
  tagsText: '',
  links: [],
  sortOrder: 0,
  isPublished: true,
});

function postToForm(post: LandingPost): PostFormState {
  return {
    title: post.title,
    description: post.description,
    badge: post.badge || '',
    previewUrl: post.previewUrl,
    previewType: post.previewType,
    body: post.body || '',
    bodyMediaUrl: post.bodyMediaUrl || '',
    bodyMediaType: post.bodyMediaType || '',
    tagsText: post.tags.join(', '),
    links: post.links.length > 0 ? post.links : [],
    sortOrder: post.sortOrder,
    isPublished: post.isPublished,
  };
}

function MediaUploadField({
  label,
  url,
  mediaType,
  onUpload,
  onClear,
  uploading,
}: {
  label: string;
  url: string;
  mediaType?: 'image' | 'video' | '';
  onUpload: (file: File) => Promise<void>;
  onClear: () => void;
  uploading: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {url ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted/30">
          {mediaType === 'video' ? (
            <video src={url} className="max-h-48 w-full object-cover" controls />
          ) : (
            <img src={url} alt="" className="max-h-48 w-full object-cover" />
          )}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="absolute start-2 top-2"
            onClick={onClear}
          >
            حذف
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-muted/20 p-6 text-muted-foreground hover:bg-muted/40">
          {uploading ? (
            <Loader2 className="mb-2 h-6 w-6 animate-spin" />
          ) : mediaType === 'video' ? (
            <Film className="mb-2 h-6 w-6" />
          ) : (
            <ImageIcon className="mb-2 h-6 w-6" />
          )}
          <span className="text-sm">{uploading ? 'در حال آپلود...' : 'انتخاب تصویر یا ویدیو'}</span>
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await onUpload(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}

export default function AdminLandingPage() {
  const { db, user, authLoading, storageType } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();

  const [posts, setPosts] = useState<LandingPost[]>([]);
  const [sectionTitle, setSectionTitle] = useState('نمونه پروژه‌ها');
  const [contacts, setContacts] = useState<LandingContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PostFormState>(emptyPostForm());
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);

  const loadContent = useCallback(async () => {
    if (!db) return;
    setIsLoading(true);
    try {
      const data = await db.getLandingContentAdmin();
      setPosts(data.posts);
      setSectionTitle(data.settings.sectionTitle);
      setContacts(data.settings.contacts);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'بارگذاری محتوای لندینگ ناموفق بود.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [db, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'superadmin') {
      router.push('/dashboard');
      return;
    }
    if (storageType !== 'online') return;
    loadContent();
  }, [authLoading, user, router, storageType, loadContent]);

  const uploadMedia = async (file: File) => {
    if (!db) throw new Error('No database');
    return db.uploadFile(file);
  };

  const handleSaveSettings = async () => {
    if (!db) return;
    setIsSavingSettings(true);
    try {
      await db.updateLandingSettings({ sectionTitle, contacts });
      toast({ title: 'ذخیره شد', description: 'تنظیمات لندینگ به‌روزرسانی شد.' });
    } catch {
      toast({ variant: 'destructive', title: 'خطا', description: 'ذخیره تنظیمات ناموفق بود.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyPostForm());
    setDialogOpen(true);
  };

  const openEditDialog = (post: LandingPost) => {
    setEditingId(post.id);
    setForm(postToForm(post));
    setDialogOpen(true);
  };

  const handleSavePost = async () => {
    if (!db) return;
    if (!form.title.trim() || !form.description.trim() || !form.previewUrl) {
      toast({
        variant: 'destructive',
        title: 'اطلاعات ناقص',
        description: 'عنوان، توضیح کوتاه و تصویر/ویدیو پیش‌نمایش الزامی است.',
      });
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      badge: form.badge.trim() || undefined,
      previewUrl: toUploadPath(form.previewUrl),
      previewType: form.previewType,
      body: form.body.trim() || undefined,
      bodyMediaUrl: form.bodyMediaUrl ? toUploadPath(form.bodyMediaUrl) : undefined,
      bodyMediaType: form.bodyMediaType || undefined,
      tags: form.tagsText.split(',').map((t) => t.trim()).filter(Boolean),
      links: form.links.filter((l) => l.label.trim() && l.url.trim()),
      sortOrder: form.sortOrder,
      isPublished: form.isPublished,
    };

    setIsSavingPost(true);
    try {
      if (editingId) {
        await db.updateLandingPost(editingId, payload);
      } else {
        await db.createLandingPost(payload as Omit<LandingPost, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setDialogOpen(false);
      await loadContent();
      toast({ title: 'ذخیره شد', description: 'پست لندینگ ذخیره شد.' });
    } catch {
      toast({ variant: 'destructive', title: 'خطا', description: 'ذخیره پست ناموفق بود.' });
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!db || !confirm('این پست حذف شود؟')) return;
    try {
      await db.deleteLandingPost(id);
      await loadContent();
      toast({ title: 'حذف شد' });
    } catch {
      toast({ variant: 'destructive', title: 'خطا', description: 'حذف پست ناموفق بود.' });
    }
  };

  const addLink = () => {
    setForm((f) => ({ ...f, links: [...f.links, { label: '', url: '' }] }));
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    setForm((f) => ({
      ...f,
      links: f.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    }));
  };

  const removeLink = (index: number) => {
    setForm((f) => ({ ...f, links: f.links.filter((_, i) => i !== index) }));
  };

  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (storageType !== 'online') {
    return (
      <div className="space-y-4">
        <PageHeader title="محتوای لندینگ" description="مدیریت پست‌های تبلیغاتی صفحه ورود" />
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            مدیریت محتوای لندینگ فقط در حالت آنلاین (سرور) در دسترس است.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="محتوای لندینگ"
        description="پست‌های تبلیغاتی و راه‌های ارتباطی صفحه ورود را مدیریت کنید."
      />

      <Card>
        <CardHeader>
          <CardTitle>تنظیمات بخش</CardTitle>
          <CardDescription>عنوان سکشن و اطلاعات تماس نمایش‌داده‌شده در لندینگ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section-title">عنوان بخش</Label>
            <Input
              id="section-title"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>راه‌های ارتباطی</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setContacts((c) => [...c, { ...EMPTY_CONTACT }])}
              >
                <Plus className="ms-1 h-4 w-4" />
                افزودن
              </Button>
            </div>
            {contacts.map((contact, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-white/10 p-3 sm:grid-cols-4">
                <Select
                  value={contact.type}
                  onValueChange={(v) =>
                    setContacts((c) =>
                      c.map((item, i) =>
                        i === index ? { ...item, type: v as LandingContact['type'] } : item
                      )
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telegram">تلگرام</SelectItem>
                    <SelectItem value="phone">تلفن</SelectItem>
                    <SelectItem value="email">ایمیل</SelectItem>
                    <SelectItem value="website">وب‌سایت</SelectItem>
                    <SelectItem value="custom">سفارشی</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="برچسب"
                  value={contact.label}
                  onChange={(e) =>
                    setContacts((c) =>
                      c.map((item, i) => (i === index ? { ...item, label: e.target.value } : item))
                    )
                  }
                />
                <Input
                  placeholder="مقدار (آیدی، شماره، ...)"
                  value={contact.value}
                  onChange={(e) =>
                    setContacts((c) =>
                      c.map((item, i) => (i === index ? { ...item, value: e.target.value } : item))
                    )
                  }
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="لینک (اختیاری)"
                    value={contact.href || ''}
                    onChange={(e) =>
                      setContacts((c) =>
                        c.map((item, i) =>
                          i === index ? { ...item, href: e.target.value || undefined } : item
                        )
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setContacts((c) => c.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
            {isSavingSettings && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            ذخیره تنظیمات
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>پست‌ها</CardTitle>
            <CardDescription>کارت‌های نمایش‌داده‌شده در صفحه ورود</CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="ms-1 h-4 w-4" />
            پست جدید
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز پستی ثبت نشده است.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>عنوان</TableHead>
                  <TableHead>نشان</TableHead>
                  <TableHead>ترتیب</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-left">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell>{post.badge || '—'}</TableCell>
                    <TableCell>{post.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={post.isPublished ? 'success' : 'secondary'}>
                        {post.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(post)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'ویرایش پست' : 'پست جدید'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>عنوان</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>توضیح کوتاه (روی کارت)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>نشان (badge)</Label>
                <Input
                  value={form.badge}
                  onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  placeholder="Tool • Canvas"
                />
              </div>
              <div className="space-y-2">
                <Label>ترتیب نمایش</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <MediaUploadField
              label="پیش‌نمایش (تصویر/ویدیو کارت)"
              url={form.previewUrl}
              mediaType={form.previewType}
              uploading={uploadingPreview}
              onClear={() => setForm((f) => ({ ...f, previewUrl: '', previewType: 'image' }))}
              onUpload={async (file) => {
                setUploadingPreview(true);
                try {
                  const url = await uploadMedia(file);
                  setForm((f) => ({
                    ...f,
                    previewUrl: url,
                    previewType: file.type.startsWith('video/') ? 'video' : 'image',
                  }));
                } catch {
                  toast({ variant: 'destructive', title: 'خطا در آپلود' });
                } finally {
                  setUploadingPreview(false);
                }
              }}
            />

            <div className="space-y-2">
              <Label>متن کامل (در مودال)</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={4}
              />
            </div>

            <MediaUploadField
              label="رسانه مودال (اختیاری)"
              url={form.bodyMediaUrl}
              mediaType={form.bodyMediaType || undefined}
              uploading={uploadingBody}
              onClear={() => setForm((f) => ({ ...f, bodyMediaUrl: '', bodyMediaType: '' }))}
              onUpload={async (file) => {
                setUploadingBody(true);
                try {
                  const url = await uploadMedia(file);
                  setForm((f) => ({
                    ...f,
                    bodyMediaUrl: url,
                    bodyMediaType: file.type.startsWith('video/') ? 'video' : 'image',
                  }));
                } catch {
                  toast({ variant: 'destructive', title: 'خطا در آپلود' });
                } finally {
                  setUploadingBody(false);
                }
              }}
            />

            <div className="space-y-2">
              <Label>برچسب‌ها (با کاما جدا کنید)</Label>
              <Input
                value={form.tagsText}
                onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
                placeholder="Vue, Laravel, RTL"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>لینک‌ها</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLink}>
                  <Plus className="ms-1 h-4 w-4" />
                  افزودن لینک
                </Button>
              </div>
              {form.links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="برچسب"
                    value={link.label}
                    onChange={(e) => updateLink(index, 'label', e.target.value)}
                  />
                  <Input
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.isPublished}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isPublished: checked }))}
              />
              <Label>منتشر شده</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleSavePost} disabled={isSavingPost}>
              {isSavingPost && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
