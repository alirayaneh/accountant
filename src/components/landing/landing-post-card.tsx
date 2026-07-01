'use client';

import type { LandingPost } from '@/lib/types';
import { resolveLandingMediaUrl } from '@/lib/landing-media';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type LandingPostCardProps = {
  post: LandingPost;
  onClick: () => void;
};

export function LandingPostCard({ post, onClick }: LandingPostCardProps) {
  const previewSrc = resolveLandingMediaUrl(post.previewUrl);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 text-right shadow-glass backdrop-blur-xl transition-all',
        'hover:border-primary/30 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/30">
        {post.previewType === 'video' ? (
          <video
            src={previewSrc}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            muted
            playsInline
          />
        ) : (
          <img
            src={previewSrc}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )}
        {post.badge && (
          <Badge className="absolute end-3 top-3 border-white/10 bg-background/70 text-xs backdrop-blur-sm">
            {post.badge}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold leading-snug">{post.title}</h3>
          <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed">
            {post.description}
          </p>
        </div>

        {(post.tags.length > 0 || post.links.length > 0) && (
          <div className="mt-auto flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {post.links.map((link) => (
              <span
                key={`${link.label}-${link.url}`}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary"
              >
                {link.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
