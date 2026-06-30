
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/components/app-provider';
import { Loader2, BarChart3, Receipt, Package, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/logo';
import { getLocalApiURL, getRemoteApiURL } from '@/lib/api-url';
import { Badge } from '@/components/ui/badge';

const features = [
  { icon: BarChart3, text: 'داشبورد مالی با نمودارهای زنده' },
  { icon: Receipt, text: 'مدیریت فروش، مخارج و پرداخت‌ها' },
  { icon: Package, text: 'کنترل موجودی و هشدار کمبود کالا' },
  { icon: Shield, text: 'امن و سازگار با RTL فارسی' },
];

function AuthForms({
  isSigningIn,
  loginData,
  setLoginData,
  registerData,
  setRegisterData,
  onLogin,
  onRegister,
}: {
  isSigningIn: boolean;
  loginData: { email: string; password: string };
  setLoginData: (d: { email: string; password: string }) => void;
  registerData: { email: string; password: string; displayName: string };
  setRegisterData: (d: { email: string; password: string; displayName: string }) => void;
  onLogin: (e: React.FormEvent) => void;
  onRegister: (e: React.FormEvent) => void;
}) {
  return (
    <Tabs defaultValue="login" className="w-full">
      <TabsList className="grid w-full grid-cols-2 rounded-xl bg-white/5">
        <TabsTrigger value="login" className="rounded-lg">ورود</TabsTrigger>
        <TabsTrigger value="register" className="rounded-lg">ثبت نام</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <form onSubmit={onLogin} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">ایمیل</Label>
            <Input
              id="login-email"
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              required
              disabled={isSigningIn}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">رمز عبور</Label>
            <Input
              id="login-password"
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              required
              disabled={isSigningIn}
            />
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={isSigningIn}>
            {isSigningIn && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            ورود
          </Button>
        </form>
      </TabsContent>
      <TabsContent value="register">
        <form onSubmit={onRegister} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="register-name">نام نمایشی</Label>
            <Input
              id="register-name"
              value={registerData.displayName}
              onChange={(e) => setRegisterData({ ...registerData, displayName: e.target.value })}
              required
              disabled={isSigningIn}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">ایمیل</Label>
            <Input
              id="register-email"
              type="email"
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
              required
              disabled={isSigningIn}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">رمز عبور</Label>
            <Input
              id="register-password"
              type="password"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
              required
              minLength={6}
              disabled={isSigningIn}
            />
          </div>
          <Button type="submit" variant="gradient" className="w-full" disabled={isSigningIn}>
            {isSigningIn && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            ثبت نام
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}

export default function LoginPage() {
  const { user, authLoading, storageType } = useAppContext();
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', displayName: '' });

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSimpleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSigningIn(true);
    try {
      const apiURL = storageType === 'online' ? getRemoteApiURL() : getLocalApiURL();
      const response = await fetch(`${apiURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ورود ناموفق بود');
      localStorage.setItem('apiToken', data.token);
      toast({ title: 'ورود موفق', description: 'به سیستم خوش آمدید' });
      router.push('/dashboard');
      window.location.reload();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'خطا در ورود',
        description: error instanceof Error ? error.message : 'خطای ناشناخته',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSimpleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSigningIn(true);
    try {
      const apiURL = storageType === 'online' ? getRemoteApiURL() : getLocalApiURL();
      const response = await fetch(`${apiURL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ثبت نام ناموفق بود');
      localStorage.setItem('apiToken', data.token);
      toast({ title: 'ثبت نام موفق', description: 'حساب کاربری شما ایجاد شد' });
      router.push('/dashboard');
      window.location.reload();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'خطا در ثبت نام',
        description: error instanceof Error ? error.message : 'خطای ناشناخته',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden flex-1 flex-col justify-center gap-8 p-12 lg:flex">
        <Badge variant="success" className="w-fit gap-2">
          <span className="h-2 w-2 animate-glow-pulse rounded-full bg-success" />
          سیستم حسابداری آنلاین
        </Badge>
        <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
          <span className="gradient-text">حسابدار آنلاین آموزا</span>
          <br />
          مدیریت حرفه‌ای کسب‌وکار
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground leading-relaxed">
          فروش، مخارج، موجودی و گزارش‌های مالی — همه در یک داشبورد زیبا و سریع.
        </p>
        <ul className="space-y-4">
          {features.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-muted-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              {text}
            </li>
          ))}
        </ul>
        {/* Terminal mock */}
        <div className="max-w-md rounded-2xl border border-white/10 bg-card/60 shadow-glass backdrop-blur-xl overflow-hidden">
          <div className="flex h-10 items-center gap-2 border-b border-white/10 px-4">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <pre className="p-4 text-left text-xs leading-relaxed text-muted-foreground font-code" dir="ltr">
{`const dashboard = {
  sales: 12_450_000,
  expenses: 3_200_000,
  netProfit: 9_250_000,
  invoices: 47,
  status: "online"
}`}
          </pre>
        </div>
      </div>

      {/* Login card */}
      <div className="flex flex-1 items-center justify-center p-6">
        <Card variant="glass" className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <Logo>حسابدار آنلاین آموزا</Logo>
            </div>
            <CardTitle className="text-2xl">ورود به حساب کاربری</CardTitle>
            <CardDescription>
              برای دسترسی به داشبورد، وارد شوید یا حساب جدید بسازید.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForms
                isSigningIn={isSigningIn}
                loginData={loginData}
                setLoginData={setLoginData}
                registerData={registerData}
                setRegisterData={setRegisterData}
                onLogin={handleSimpleLogin}
                onRegister={handleSimpleRegister}
              />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
