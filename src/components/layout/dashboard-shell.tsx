import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl animate-fade-up', className)}>
      {children}
    </div>
  );
}
