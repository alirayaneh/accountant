'use client';

import type { LandingContact } from '@/lib/types';
import { Globe, Mail, Phone, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type LandingContactBarProps = {
  contacts: LandingContact[];
};

function getContactHref(contact: LandingContact): string {
  if (contact.href) return contact.href;
  switch (contact.type) {
    case 'telegram':
      return contact.value.startsWith('http')
        ? contact.value
        : `https://t.me/${contact.value.replace(/^@/, '')}`;
    case 'phone':
      return `tel:${contact.value.replace(/\s/g, '')}`;
    case 'email':
      return `mailto:${contact.value}`;
    case 'website':
      return contact.value.startsWith('http') ? contact.value : `https://${contact.value}`;
    default:
      return contact.value.startsWith('http') ? contact.value : '#';
  }
}

function ContactIcon({ type }: { type: LandingContact['type'] }) {
  switch (type) {
    case 'telegram':
      return <Send className="h-4 w-4" />;
    case 'phone':
      return <Phone className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'website':
      return <Globe className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
}

export function LandingContactBar({ contacts }: LandingContactBarProps) {
  if (contacts.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {contacts.map((contact, index) => {
        const href = getContactHref(contact);
        const isLink = href !== '#';

        const className = cn(
          'inline-flex items-center gap-2 rounded-full border border-white/10 bg-card/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-xl transition-colors',
          isLink && 'hover:border-primary/30 hover:text-foreground'
        );

        if (!isLink) {
          return (
            <span key={`${contact.label}-${index}`} className={className}>
              <ContactIcon type={contact.type} />
              <span>{contact.label}: {contact.value}</span>
            </span>
          );
        }

        return (
          <a
            key={`${contact.label}-${index}`}
            href={href}
            target={contact.type === 'phone' || contact.type === 'email' ? undefined : '_blank'}
            rel="noopener noreferrer"
            className={className}
          >
            <ContactIcon type={contact.type} />
            <span>{contact.label}: {contact.value}</span>
          </a>
        );
      })}
    </div>
  );
}
