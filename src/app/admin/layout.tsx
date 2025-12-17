
"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<'superadmin' | 'trainer' | null>(null);
  const [currentUser, setCurrentUser] = useState<{name: string} | null>(null);

  useEffect(() => {
    const role = sessionStorage.getItem('userRole') as 'superadmin' | 'trainer' | null;
    const userJson = sessionStorage.getItem('user');
    if (role) {
      setUserRole(role);
      if (userJson) {
        setCurrentUser(JSON.parse(userJson));
      }
    } else {
        router.push('/admin-login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
        <header className="bg-background border-b sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
                 <p className="text-xl font-bold text-primary tracking-tight">BSA Training Academy, Pune</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => {
                            sessionStorage.clear();
                            router.push('/login');
                    }}>Logout</Button>
                </div>
            </div>
        </header>

        <main className="container mx-auto p-4 md:p-8 flex-grow">
             <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {currentUser ? `Welcome, ${currentUser.name}` : (userRole === 'superadmin' ? 'Admin Dashboard' : 'Trainer Dashboard')}
                    </h1>
                    <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
                        {userRole === 'superadmin' ? 'Manage training batches, registrations, and participants.' : 'Manage your assigned training batches and exams.'}
                    </p>
                </div>
            </div>
            
            {children}
        </main>
    </div>
  );
}
