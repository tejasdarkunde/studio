
"use client";

import { usePathname, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import type { OrganizationAdmin } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Building, CalendarCheck, Presentation, Users, LayoutDashboard } from 'lucide-react';

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const organizationName = params.organizationName as string;

  const [currentUser, setCurrentUser] = useState<OrganizationAdmin | null>(null);

  useEffect(() => {
    const userJson = sessionStorage.getItem('user');
    const role = sessionStorage.getItem('userRole');
    if (userJson && role === 'organization-admin') {
      setCurrentUser(JSON.parse(userJson));
    } else {
        router.push('/admin-login');
    }
  }, [router]);

  const navLinks = [
    { href: `/organization/${organizationName}`, label: 'Overview', icon: LayoutDashboard },
    { href: `/organization/${organizationName}/participants`, label: 'Participants', icon: Users },
    { href: `/organization/${organizationName}/trainings`, label: 'Trainings', icon: Presentation },
    { href: `/organization/${organizationName}/attendance`, label: 'Attendance', icon: CalendarCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col">
        
        <main className="container mx-auto p-4 md:p-8 flex-grow">
            <nav className="mb-6">
                <div className="border-b">
                    <div className="flex items-center gap-4">
                        {navLinks.map(link => (
                            <Link key={link.href} href={link.href}>
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-2.5 border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-primary",
                                    pathname === link.href && "border-primary text-primary"
                                )}>
                                    <link.icon className="h-4 w-4" />
                                    {link.label}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>
            {children}
        </main>
    </div>
  );
}
