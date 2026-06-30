
'use client';

import type { ReactNode } from 'react';
import { MainSidebar } from '@/components/layout/main-sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { PanelLeft } from 'lucide-react';
import { FirebaseStatusIndicator } from '@/components/layout/firebase-status-indicator';
import { GlobalProgressBar } from '@/components/layout/global-progress-bar';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAppContext } from '@/components/app-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/logo';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { Skeleton } from '@/components/ui/skeleton';

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, authLoading } = useAppContext();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    if (authLoading || !user) {
        return (
             <div className="flex min-h-screen items-center justify-center">
                <GlobalProgressBar />
                <div className="w-full max-w-md space-y-4 p-8">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-32 w-full rounded-2xl" />
                  <Skeleton className="h-32 w-full rounded-2xl" />
                </div>
             </div>
        )
    }

    return <>{children}</>;
}


export default function DashboardLayout({ children }: { children: ReactNode }) {
    const { settings } = useAppContext();
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 hidden items-center justify-between border-b border-white/10 bg-background/80 px-6 py-3 backdrop-blur-xl md:flex">
            <Logo>{settings.shopName || 'حسابدار آنلاین آموزا'}</Logo>
            <ThemeSwitcher />
          </header>
          <header className="flex items-center justify-between border-b border-white/10 p-4 md:hidden">
              <SidebarTrigger>
                  <PanelLeft className="h-6 w-6" />
              </SidebarTrigger>
              <Logo>{settings.shopName || 'حسابدار آنلاین آموزا'}</Logo>
          </header>
          <GlobalProgressBar />
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <DashboardShell>{children}</DashboardShell>
          </main>
          <FirebaseStatusIndicator />
        </SidebarInset>
      </div>
    </ProtectedRoute>
  );
}
