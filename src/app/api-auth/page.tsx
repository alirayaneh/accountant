'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getLocalApiURL } from '@/lib/api-url';

export default function APIAuthPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({
        email: '',
        password: '',
        displayName: ''
    });

    const apiURL = getLocalApiURL();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${apiURL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            localStorage.setItem('apiToken', data.token);

            toast({
                title: 'ورود موفق',
                description: 'به سیستم خوش آمدید'
            });

            router.push('/dashboard');
            window.location.reload();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'خطا در ورود',
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${apiURL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Registration failed');
            }

            const data = await response.json();
            localStorage.setItem('apiToken', data.token);

            toast({
                title: 'ثبت نام موفق',
                description: 'حساب کاربری شما ایجاد شد'
            });

            router.push('/dashboard');
            window.location.reload();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'خطا در ثبت نام',
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">ورود به API Backend</CardTitle>
                    <CardDescription className="text-center">
                        برای استفاده از بک‌اند، وارد شوید یا ثبت نام کنید
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">ورود</TabsTrigger>
                            <TabsTrigger value="register">ثبت نام</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-email">ایمیل</Label>
                                    <Input
                                        id="login-email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={loginData.email}
                                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">رمز عبور</Label>
                                    <Input
                                        id="login-password"
                                        type="password"
                                        placeholder="رمز عبور"
                                        value={loginData.password}
                                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                    {isLoading ? 'در حال ورود...' : 'ورود'}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="register">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="register-name">نام نمایشی</Label>
                                    <Input
                                        id="register-name"
                                        type="text"
                                        placeholder="نام شما"
                                        value={registerData.displayName}
                                        onChange={(e) => setRegisterData({ ...registerData, displayName: e.target.value })}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="register-email">ایمیل</Label>
                                    <Input
                                        id="register-email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={registerData.email}
                                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="register-password">رمز عبور</Label>
                                    <Input
                                        id="register-password"
                                        type="password"
                                        placeholder="رمز عبور (حداقل 6 کاراکتر)"
                                        value={registerData.password}
                                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                        required
                                        minLength={6}
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                    {isLoading ? 'در حال ثبت نام...' : 'ثبت نام'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>

                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        <p>پس از ورود، به داشبورد منتقل می‌شوید</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
