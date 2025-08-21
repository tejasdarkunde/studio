
"use client";

import { useParams } from 'next/navigation'
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Registration } from '@/lib/types';
import { RegistrationForm } from '@/components/features/registration-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getRedirectLink } from '@/app/actions';


export default function RegistrationPage() {
  const { toast } = useToast();
  const params = useParams();
  const batchId = params.batchId as ('diploma' | 'advance-diploma');

  if (batchId !== 'diploma' && batchId !== 'advance-diploma') {
    notFound();
  }

  const handleRegistrationSuccess = async (newRegistration: Registration, registeredBatchId: 'diploma' | 'advance-diploma') => {
    toast({
      title: "Registration Successful!",
      description: "Your submission has been recorded. You will be redirected shortly.",
    });

    try {
      const { link, linkName } = await getRedirectLink(registeredBatchId);
      
      if (link && link.trim() !== '') {
        setTimeout(() => {
          window.location.href = link;
        }, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Redirect Failed",
          description: `The ${linkName} has not been set by the admin. Please contact support.`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error fetching redirect link:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not retrieve redirect link from the database.",
      });
    }
  };

  const programName = batchId === 'diploma' ? 'Diploma Program' : 'Advance Diploma Program';

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col items-center justify-center text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
              {programName}
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
                        batchId={batchId}
                        onSuccess={handleRegistrationSuccess}
                    />
                    </CardContent>
                </Card>
            </div>
        </div>
        <div className="text-center mt-8">
            <Link href="/" passHref>
                <button className="text-primary hover:underline">Back to Home</button>
            </Link>
        </div>
      </div>
    </main>
  );
}
