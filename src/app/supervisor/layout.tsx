
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Supervisor } from '@/lib/types';
import { ChevronLeft, LayoutDashboard, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Supervisor | null>(null);

  useEffect(() => {
    const userRole = sessionStorage.getItem('userRole');
    const userJson = sessionStorage.getItem('user');

    if (userRole === 'supervisor' && userJson) {
      const currentUser = JSON.parse(userJson);
      setUser(currentUser);
    } else {
      router.push('/supervisor-login');
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/supervisor-login');
  };

  if (!user) {
      return null; // Or a loading spinner
  }
  
  const navItems = [
      { href: '/supervisor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/supervisor/trainees', label: 'Manage Trainees', icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
             <p className="text-xl font-bold text-primary tracking-tight">Supervisor Portal</p>
             {user.organization && (
                <>
                    <div className="h-6 w-px bg-border" />
                    <p className="text-lg font-semibold text-muted-foreground">{user.organization}</p>
                </>
             )}
          </div>
           <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.name}</span>
                <Button variant="outline" onClick={handleLogout}>
                    Logout
                </Button>
            </div>
        </div>
      </header>
      <div className="container mx-auto flex-grow">
        <nav className="my-6">
             <div className="flex items-center gap-2 rounded-lg border p-1 bg-muted">
                {navItems.map(item => (
                     <Button 
                        key={item.href}
                        asChild 
                        variant={pathname === item.href ? 'default' : 'ghost'} 
                        className={cn("flex-1 justify-start", pathname === item.href && "shadow-sm")}
                    >
                        <Link href={item.href} >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                        </Link>
                    </Button>
                ))}
            </div>
        </nav>
        <main>
            {children}
        </main>
      </div>
    </div>
  );
}
