"use client";

import { useState, useEffect } from 'react';
import type { Registration } from '@/lib/types';
import { RegistrationForm } from '@/components/features/registration-form';
import { RegistrationsTable } from '@/components/features/registrations-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const storedRegistrations = localStorage.getItem('eventlink-registrations');
      if (storedRegistrations) {
        const parsedRegistrations = JSON.parse(storedRegistrations);
        // Basic validation
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
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col items-center justify-center text-center mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
          EventLink
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Register for your event.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2">
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
        <div className="lg:col-span-3">
          <RegistrationsTable 
            registrations={registrations}
          />
        </div>
      </div>
    </main>
  );
}