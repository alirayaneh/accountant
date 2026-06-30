'use client';

import type { LandingPost } from '@/lib/types';
import { resolveLandingMediaUrl } from '@/lib/landing-media';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

type LandingPostModalProps = {
  post: LandingPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LandingPostModal({ post, open, onOpenChange }: LandingPostModalProps) {
  if (!post) return null;

  const bodyMediaSrc = post.bodyMediaUrl ? resolveLandingMediaUrl(post.bodyMediaUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-white/10 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            {post.badge && <Badge variant="secondary">{post.badge}</Badge>}
            <DialogTitle className="text-xl">{post.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {bodyMediaSrc && (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-muted/20">
              {post.bodyMediaType === 'video' ? (
                <video src={bodyMediaSrc} className="max-h-[50vh] w-full object-contain" controls autoPlay />
              ) : (
                <img src={bodyMediaSrc} alt={post.title} className="max-h-[50vh] w-full object-contain" />
              )}
            </div>
          )}

          {post.body && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {post.body}
            </p>
          )}

          {!post.body && !bodyMediaSrc && (
            <p className="text-sm leading-relaxed text-muted-foreground">{post.description}</p>
          )}

          {(post.tags.length > 0 || post.links.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {post.links.map((link) => (
                <Button key={`${link.label}-${link.url}`} variant="outline" size="sm" asChild>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                    <ExternalLink className="ms-1 h-3.5 w-3.5" />
                  </a>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
