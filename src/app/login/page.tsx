
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, User, UserCog } from 'lucide-react';

export default function CentralLoginPage() {
  const loginOptions = [
    {
      role: "Admin / Trainer",
      description: "Access the main dashboard to manage trainings, users, and content.",
      href: "/admin-login",
      icon: <Shield className="h-6 w-6 text-primary" />,
    },
    {
      role: "Trainee",
      description: "Access your course materials, lessons, and take exams.",
      href: "/trainee-login",
      icon: <User className="h-6 w-6 text-primary" />,
    },
    {
      role: "Supervisor",
      description: "Submit applications on behalf of students.",
      href: "/supervisor-login",
      icon: <UserCog className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen">
       <div className="flex flex-col items-center justify-center text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
              BSA Edutech India Pvt. Ltd. Portal
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Please select your role to log in.
            </p>
        </div>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
            {loginOptions.map((option) => (
                <Card key={option.role}>
                    <CardHeader className="flex flex-row items-center gap-4">
                        {option.icon}
                        <div>
                            <CardTitle>{option.role}</CardTitle>
                            <CardDescription>{option.description}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardFooter>
                         <Button asChild className="w-full">
                            <Link href={option.href}>
                                Proceed to Login <ArrowRight className="ml-2" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
         <div className="text-center mt-12">
            <Link href="/home2" passHref>
                <button className="text-sm text-primary hover:underline">Or continue to the public homepage</button>
            </Link>
        </div>
    </main>
  );
}
