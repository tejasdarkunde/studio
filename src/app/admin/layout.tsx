
"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<'superadmin' | 'trainer' | null>(null);
  const [currentUser, setCurrentUser] = useState<{name: string} | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const role = sessionStorage.getItem('userRole') as 'superadmin' | 'trainer' | null;
    const userJson = sessionStorage.getItem('user');
    if (role) {
      setUserRole(role);
      if (userJson) {
        setCurrentUser(JSON.parse(userJson));
      }
    } else {
        router.push('/login');
    }
  }, [router]);

  const getActiveTab = () => {
    if (pathname.startsWith('/admin/exams')) return 'exams';
    if (pathname === '/admin') { // Heuristic, might need adjustment
        // This is tricky without more context on default tab
        // Let's assume it defaults to a known tab or we can leave it unset
        // For now, let's just check for exact path match to avoid setting it incorrectly
    }
    return ''; // Or a default tab value
  }

  const handleTabChange = (value: string) => {
    if (value === 'exams') {
        router.push('/admin/exams');
    } else {
        router.push('/admin'); // Assuming other tabs are on the main admin page
    }
  };


  const SuperAdminTabs = () => (
    <TabsList className="grid w-full grid-cols-9">
        <TabsTrigger value="reports" onClick={() => router.push('/admin')}>Reports</TabsTrigger>
        <TabsTrigger value="trainings" onClick={() => router.push('/admin')}>Trainings</TabsTrigger>
        <TabsTrigger value="courses" onClick={() => router.push('/admin')}>Courses</TabsTrigger>
        <TabsTrigger value="exams" onClick={() => router.push('/admin/exams')}>Exams</TabsTrigger>
        <TabsTrigger value="users" onClick={() => router.push('/admin')}>All Users</TabsTrigger>
        <TabsTrigger value="trainers" onClick={() => router.push('/admin')}>Trainers</TabsTrigger>
        <TabsTrigger value="organizations" onClick={() => router.push('/admin')}>Organizations</TabsTrigger>
        <TabsTrigger value="admins" onClick={() => router.push('/admin')}>Admins</TabsTrigger>
        <TabsTrigger value="attendance" onClick={() => router.push('/admin')}>Attendance</TabsTrigger>
    </TabsList>
  );

  const TrainerTabs = () => (
    <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="trainings" onClick={() => router.push('/admin')}>My Trainings</TabsTrigger>
        <TabsTrigger value="attendance" onClick={() => router.push('/admin')}>My Attendance</TabsTrigger>
    </TabsList>
  );


  return (
    <div className="min-h-screen flex flex-col">
        <header className="bg-background border-b sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
                 <p className="text-xl font-bold text-primary tracking-tight">BSA Training Academy, Pune</p>
                <div className="flex items-center gap-2">
                    {userRole === 'superadmin' && currentUser && (
                         <Link href="/admin/profile" passHref>
                            <Button variant="outline" size="sm">
                                <UserCircle className="mr-2 h-4 w-4"/> My Profile
                            </Button>
                        </Link>
                    )}
                    <Button variant="outline" onClick={() => {
                            sessionStorage.clear();
                            router.push('/login');
                    }}>Logout</Button>
                </div>
            </div>
        </header>

        <div className="container mx-auto p-4 md:p-8 flex-grow">
             <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {currentUser ? `Welcome, ${currentUser.name}` : (userRole === 'superadmin' ? 'Admin Dashboard' : 'Trainer Dashboard')}
                    </h1>
                    <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
                        {userRole === 'superadmin' ? 'Manage training batches, registrations, and participants.' : 'Manage your assigned training batches.'}
                    </p>
                </div>
            </div>
            
            <Tabs defaultValue={getActiveTab()} value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
                 {isClient && (userRole === 'superadmin' ? <SuperAdminTabs /> : <TrainerTabs />)}
            </Tabs>

            {children}
        </div>
    </div>
  );
}
