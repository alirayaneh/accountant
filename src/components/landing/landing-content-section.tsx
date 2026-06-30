'use client';

import { useEffect, useState } from 'react';
import type { LandingContent, LandingPost } from '@/lib/types';
import { getRemoteApiURL } from '@/lib/api-url';
import { LandingPostCard } from '@/components/landing/landing-post-card';
import { LandingPostModal } from '@/components/landing/landing-post-modal';
import { LandingContactBar } from '@/components/landing/landing-contact-bar';

export function LandingContentSection() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [selectedPost, setSelectedPost] = useState<LandingPost | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${getRemoteApiURL()}/api/landing`);
        if (!res.ok) return;
        const data = (await res.json()) as LandingContent;
        if (!cancelled && data.posts?.length > 0) {
          setContent(data);
        }
      } catch {
        // hide section on failure
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!content || content.posts.length === 0) return null;

  const openPost = (post: LandingPost) => {
    setSelectedPost(post);
    setModalOpen(true);
  };

  return (
    <section className="border-t border-white/10 bg-background/40 px-6 py-16 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{content.settings.sectionTitle}</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {content.posts.map((post) => (
            <LandingPostCard key={post.id} post={post} onClick={() => openPost(post)} />
          ))}
        </div>

        <LandingContactBar contacts={content.settings.contacts} />
      </div>

      <LandingPostModal
        post={selectedPost}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </section>
  );
}
