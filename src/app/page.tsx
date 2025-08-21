
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function Home() {

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen justify-center">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col items-center justify-center text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
              EventLink
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Welcome! Please select your program to register.
            </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                  <CardTitle>Diploma Program</CardTitle>
                  <CardDescription>Register for the Diploma Program session.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/register/diploma" passHref>
                    <Button className="w-full">
                      Register for Diploma <ArrowRight className="ml-2" />
                    </Button>
                  </Link>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                  <CardTitle>Advance Diploma Program</CardTitle>
                  <CardDescription>Register for the Advance Diploma Program session.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/register/advance-diploma" passHref>
                        <Button className="w-full">
                            Register for Advance Diploma <ArrowRight className="ml-2" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
        <div className="text-center mt-12">
            <Link href="/admin" passHref>
                <Button variant="link">Admin Access</Button>
            </Link>
        </div>
      </div>
    </main>
  );
}
