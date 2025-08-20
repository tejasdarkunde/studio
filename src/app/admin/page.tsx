"use client";

import { useState, useEffect } from 'react';
import type { Registration } from '@/lib/types';
import { RegistrationsTable } from '@/components/features/registrations-table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const storedRegistrations = localStorage.getItem('eventlink-registrations');
      if (storedRegistrations) {
        const parsedRegistrations = JSON.parse(storedRegistrations);
        if (Array.isArray(parsedRegistrations)) {
            setRegistrations(parsedRegistrations);
        }
      }
    } catch (error) {
      console.error("Failed to parse registrations from localStorage", error);
    }
  }, []);

  return (
    <main className="container mx-auto p-4 md:p-8">
       <div className="flex justify-between items-center mb-8 md:mb-12">
        <div className="flex flex-col">
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
                Admin Access
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                View all event registrations.
            </p>
        </div>
        <Link href="/" passHref>
            <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
      
      <div className="w-full">
        <RegistrationsTable 
            registrations={registrations}
        />
      </div>
    </main>
  );
}
