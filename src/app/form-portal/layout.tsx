
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function FormPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/form-portal/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          <p className="text-xl font-bold text-primary tracking-tight">Form Portal</p>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>
      <main className="container mx-auto flex-grow">
        {children}
      </main>
    </div>
  );
}
