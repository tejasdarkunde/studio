"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Registration, Batch } from '@/lib/types';
import { RegistrationForm } from '@/components/features/registration-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  
  const handleRegistrationSuccess = (newRegistration: Registration) => {
    try {
      const storedData = localStorage.getItem('eventlink-data');
      let data: { batches: Batch[], activeBatchId: number | null } = storedData 
        ? JSON.parse(storedData) 
        : { batches: [], activeBatchId: null };

      if (data.activeBatchId === null && data.batches.length === 0) {
        const newBatch: Batch = {
            id: 1,
            name: `Event Batch 1`,
            createdAt: new Date(),
            registrations: [newRegistration],
        };
        data.batches = [newBatch];
        data.activeBatchId = 1;
      } else {
        const activeBatch = data.batches.find(b => b.id === data.activeBatchId);
        if (activeBatch) {
            activeBatch.registrations.push(newRegistration);
        } else {
           const newBatch: Batch = {
                id: data.batches.length + 1,
                name: `Event Batch ${data.batches.length + 1}`,
                createdAt: new Date(),
                registrations: [newRegistration],
            };
            data.batches.push(newBatch);
            data.activeBatchId = newBatch.id;
        }
      }
      localStorage.setItem('eventlink-data', JSON.stringify(data));
    } catch (error) {
        console.error("Failed to save registration to localStorage", error);
    }
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
