'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { useLandingContent } from '@/lib/desktop/landing-cache';
import { LandingPostCard } from '@/components/landing/landing-post-card';
import { LandingPostModal } from '@/components/landing/landing-post-modal';
import { LandingContactBar } from '@/components/landing/landing-contact-bar';
import type { LandingPost } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function NewsPage() {
  const { content, isLoading, isFromCache, error } = useLandingContent();
  const [selectedPost, setSelectedPost] = useState<LandingPost | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openPost = (post: LandingPost) => {
    setSelectedPost(post);
    setModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="تازه‌ها"
        description="آخرین پروژه‌ها، اخبار و راه‌های ارتباطی"
      />

      {isFromCache && content && (
        <Badge variant="secondary" className="w-fit">
          نمایش از حافظه محلی (آفلاین)
        </Badge>
      )}

      {isLoading && !content && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && error === 'offline_no_cache' && (
        <div className="rounded-2xl border border-white/10 bg-card/60 p-8 text-center text-muted-foreground">
          اتصال اینترنت برقرار نیست. آخرین محتوا در دسترس نیست.
        </div>
      )}

      {!isLoading && error === 'fetch_failed' && !content && (
        <div className="rounded-2xl border border-white/10 bg-card/60 p-8 text-center text-muted-foreground">
          بارگذاری محتوا ناموفق بود. لطفاً بعداً دوباره تلاش کنید.
        </div>
      )}

      {content && content.posts.length > 0 && (
        <div className="space-y-10">
          <h2 className="text-2xl font-bold">{content.settings.sectionTitle}</h2>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {content.posts.map((post) => (
              <LandingPostCard key={post.id} post={post} onClick={() => openPost(post)} />
            ))}
          </div>

          <LandingContactBar contacts={content.settings.contacts} />
        </div>
      )}

      {content && content.posts.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-white/10 bg-card/60 p-8 text-center text-muted-foreground">
          هنوز محتوایی منتشر نشده است.
        </div>
      )}

      <LandingPostModal
        post={selectedPost}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
