
"use client";

import Link from 'next/link';
import type { Registration } from '@/lib/types';
import { RegistrationForm } from '@/components/features/registration-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getRedirectLink } from '@/app/actions';


export default function Home() {
  const { toast } = useToast();

  const handleRegistrationSuccess = async (newRegistration: Registration) => {
    toast({
      title: "Registration Successful!",
      description: "Your submission has been recorded. You will be redirected shortly.",
    });

    try {
      const { link, linkName } = await getRedirectLink(newRegistration.organization);
      
      if (link && link.trim() !== '') {
        setTimeout(() => {
          window.location.href = link;
        }, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Redirect Failed",
          description: `The ${linkName} has not been set by the admin. Please contact support.`,
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
