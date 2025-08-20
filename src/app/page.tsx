"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Registration } from '@/lib/types';
import { RegistrationForm } from '@/components/features/registration-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
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

  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem('eventlink-registrations', JSON.stringify(registrations));
      } catch (error) {
        console.error("Failed to save registrations to localStorage", error);
      }
    }
  }, [registrations, isClient]);

  const handleRegistrationSuccess = (newRegistration: Registration) => {
    setRegistrations(prev => [...prev, newRegistration]);
  };

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col items-center justify-center text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
            EventLink
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Register for your event.
            </p>
        </div>
        
        <div className="flex justify-center w-full">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader>
                    <CardTitle>Register for Meeting</CardTitle>
                    <CardDescription>Fill out the form below to register.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <RegistrationForm 
                        onSuccess={handleRegistrationSuccess}
                    />
                    </CardContent>
                </Card>
            </div>
        </div>
        <div className="text-center mt-8">
            <Link href="/admin" passHref>
                <Button variant="link">Admin Access</Button>
            </Link>
        </div>
      </div>
    </main>
  );
}
