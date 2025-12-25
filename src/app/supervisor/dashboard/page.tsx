
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2, BarChart, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Supervisor } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function SupervisorDashboardPage() {
    const router = useRouter();
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userRole = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (userRole === 'supervisor' && userJson) {
            const currentUser = JSON.parse(userJson) as Supervisor;
            setSupervisor(currentUser);
        } else {
            router.push('/supervisor-login');
        }
        setLoading(false);
    }, [router]);


    if (loading || !supervisor) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="p-4 md:p-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
            {supervisor.organization && (
                <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
                    Manage trainees and view reports for {supervisor.organization}.
                </p>
            )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users />Trainee Management</CardTitle>
                    <CardDescription>View, add, or update trainees in your organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/supervisor/trainees">Manage Trainees <ChevronRight className="ml-2"/></Link>
                    </Button>
                </CardContent>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart />Reports & Exports</CardTitle>
                    <CardDescription>View detailed reports and export data for your organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/supervisor/reports">View Reports <ChevronRight className="ml-2"/></Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
