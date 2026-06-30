import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataSectionProps {
  title: string;
  description?: string;
  filters?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DataSection({ title, description, filters, children, className }: DataSectionProps) {
  return (
    <Card variant="glass" className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {filters}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
