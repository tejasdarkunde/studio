
"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import type { OrganizationAdmin } from '@/lib/types';

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<OrganizationAdmin | null>(null);

  useEffect(() => {
    const userJson = sessionStorage.getItem('user');
    if (userJson) {
      setCurrentUser(JSON.parse(userJson));
    } else {
        router.push('/admin-login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
        <header className="bg-background border-b sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
                 <p className="text-xl font-bold text-primary tracking-tight">BSA Training Academy, Pune</p>
                <div className='flex items-center gap-2'>
                    <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {currentUser?.name}</span>
                    <Button variant="outline" onClick={() => {
                            sessionStorage.clear();
                            router.push('/login');
                    }}>Logout</Button>
                </div>
            </div>
        </header>

        <main className="container mx-auto p-4 md:p-8 flex-grow">
            {children}
        </main>
    </div>
  );
}
