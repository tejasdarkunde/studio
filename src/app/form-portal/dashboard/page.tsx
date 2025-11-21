
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormAdmin } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function FormPortalDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<FormAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userRole = sessionStorage.getItem('userRole');
    const userJson = sessionStorage.getItem('user');

    if (userRole === 'formadmin' && userJson) {
      setUser(JSON.parse(userJson));
    } else {
      router.push('/form-portal/login');
    }
    setLoading(false);
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Form Portal Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome, {user.name}.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>Form Management</CardTitle>
          <CardDescription>
            This is where you will manage your forms. This section is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Form management features coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
