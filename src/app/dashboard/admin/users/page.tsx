
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppContext } from '@/components/app-provider';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/layout/page-header';
import { IS_ELECTRON_BUILD } from '@/lib/build-config';
import { _validateModule7d00c5 } from '@/lib/license/gates/admin-users';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';

export default function AdminUsersPage() {
    const { db, user, authLoading } = useAppContext();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!IS_ELECTRON_BUILD) return;
        _validateModule7d00c5().catch(() => {});
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (!user || user.role !== 'superadmin') {
            router.push('/dashboard');
            return;
        }

        if (!db) return;

        async function fetchUsers() {
            setIsLoading(true);
            try {
                const allUsers = await db.getAllUsers();
                setUsers(allUsers);
            } catch (error) {
                console.error("Failed to fetch users:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchUsers();
    }, [db, user, authLoading, router]);

    const getInitials = (name: string) => {
        return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('');
    };

    const handleImpersonate = async (targetUserId: string) => {
        if (!db) return;
        setImpersonatingId(targetUserId);
        try {
            const currentToken = localStorage.getItem('apiToken');
            const result = await db.impersonateUser(targetUserId);
            if (currentToken) {
                localStorage.setItem('originalAdminToken', currentToken);
            }
            localStorage.setItem('apiToken', result.token);
            toast({
                title: 'ورود به عنوان کاربر',
                description: `اکنون به عنوان ${result.user.displayName || result.user.email} وارد شده‌اید.`,
            });
            window.location.href = '/dashboard';
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'خطا در ورود به عنوان کاربر',
                description: error instanceof Error ? error.message : 'خطای ناشناخته',
            });
        } finally {
            setImpersonatingId(null);
        }
    };

    if (isLoading || authLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Card variant="glass">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
              title="مدیریت کاربران"
              description="لیست تمام کاربران ثبت‌شده در سیستم"
            />
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>لیست کاربران سیستم</CardTitle>
                    <CardDescription>
                        در این بخش می‌توانید لیست تمام کاربرانی که در سیستم ثبت‌نام کرده‌اند را مشاهده کنید.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>کاربر</TableHead>
                                    <TableHead>نام فروشگاه</TableHead>
                                    <TableHead>ایمیل</TableHead>
                                    <TableHead>شناسه کاربر (UID)</TableHead>
                                    <TableHead>نقش</TableHead>
                                    <TableHead className="text-left">عملیات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={u.photoURL || undefined} alt={u.displayName || 'User Avatar'} />
                                                    <AvatarFallback>{getInitials(u.displayName || u.email || 'U')}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{u.displayName || 'بدون نام نمایشی'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{u.displayName || 'بدون نام'}</TableCell>
                                        <TableCell>{u.email || '-'}</TableCell>
                                        <TableCell className="font-mono text-xs">{u.id}</TableCell>
                                        <TableCell>
                                            {u.role === 'superadmin' ? (
                                              <Badge variant="default">Super Admin</Badge>
                                            ) : u.role === 'employee' ? (
                                              <Badge variant="chip">Employee</Badge>
                                            ) : (
                                              <Badge variant="chip">User</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {u.role !== 'superadmin' && u.id !== user?.id && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={impersonatingId === u.id}
                                                    onClick={() => handleImpersonate(u.id)}
                                                >
                                                    <LogIn className="ms-1 h-4 w-4" />
                                                    ورود به عنوان
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
