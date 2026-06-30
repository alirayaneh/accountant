
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  ShoppingCart,
  FileText,
  Settings,
  History,
  Users,
  Receipt,
  CreditCard,
  LogOut,
  Shield,
  Package,
  BarChart3,
  LayoutGrid,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { useAppContext } from '@/components/app-provider';
import { Button } from '../ui/button';
import { ThemeSwitcher } from './theme-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'اصلی',
    items: [
      { href: '/dashboard', label: 'داشبورد مالی', icon: LayoutDashboard },
      { href: '/dashboard/reports', label: 'گزارش‌ها', icon: BarChart3 },
    ],
  },
  {
    label: 'فروش',
    items: [
      { href: '/dashboard/record-sale', label: 'ثبت فروش', icon: ShoppingCart },
      { href: '/dashboard/sales-history', label: 'تاریخچه فروش', icon: History },
      { href: '/dashboard/customers', label: 'مشتریان', icon: Users },
    ],
  },
  {
    label: 'مالی',
    items: [
      { href: '/dashboard/payments', label: 'پرداخت‌ها', icon: CreditCard },
      { href: '/dashboard/expenses', label: 'مخارج', icon: Receipt },
    ],
  },
  {
    label: 'موجودی',
    items: [
      { href: '/dashboard/inventory', label: 'موجودی کالا', icon: Package },
      { href: '/dashboard/add-product', label: 'افزودن محصول', icon: PlusCircle },
    ],
  },
  {
    label: 'سیستم',
    items: [
      { href: '/dashboard/settings', label: 'تنظیمات', icon: Settings },
    ],
  },
];

const adminMenuItems: NavItem[] = [
  { href: '/dashboard/admin/users', label: 'مدیریت کاربران', icon: Shield },
  { href: '/dashboard/admin/landing', label: 'محتوای لندینگ', icon: LayoutGrid },
];

export function MainSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { auth, user, settings, storageType } = useAppContext();

  const handleLogout = () => {
    localStorage.removeItem('apiToken');
    router.push('/');
    window.location.reload();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  };

  const isEmployee = user?.role === 'employee';

  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.label === 'سیستم' && isEmployee
        ? group.items.filter((item) => item.href !== '/dashboard/settings')
        : group.items,
    }))
    .filter((group) => group.items.length > 0);

  const isLinkActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    if (href === '/dashboard/inventory') {
      return pathname === href || pathname.startsWith('/dashboard/products');
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => (
    <SidebarMenuItem key={item.href}>
      <Link href={item.href} passHref>
        <SidebarMenuButton
          isActive={isLinkActive(item.href)}
          tooltip={item.label}
          className={cn(
            'text-right transition-all',
            isLinkActive(item.href) &&
              'border-s-2 border-primary bg-primary/10 text-primary shadow-[inset_0_0_20px_rgba(0,231,255,0.05)]'
          )}
        >
          <item.icon className="ms-2" />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );

  return (
    <Sidebar
      className="border-l border-white/10 bg-sidebar/80 backdrop-blur-xl"
      dir="rtl"
      side="right"
    >
      <SidebarHeader className="border-b border-white/10 p-4">
        <Logo>{settings.shopName || 'حسابدار آنلاین آموزا'}</Logo>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {visibleNavGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{group.items.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {user?.role === 'superadmin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-muted-foreground">
              پنل ادمین
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{adminMenuItems.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-white/10 p-4">
        {user && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User Avatar'} />
              <AvatarFallback>{getInitials(user.displayName || user.email || 'U')}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col truncate">
              <span className="truncate text-sm font-semibold">{user.displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        )}
        <ThemeSwitcher />
        <Button variant="ghost-glass" className="mt-2 w-full justify-start text-right" onClick={handleLogout}>
          <LogOut className="ms-2" />
          <span>خروج</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
