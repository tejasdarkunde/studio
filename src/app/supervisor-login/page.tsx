"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from "zod";
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { User, Lock, Loader2, LogIn, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { login } from '@/app/actions';

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function SupervisorLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await login(values);

      if (result.success && result.role === 'supervisor') {
        toast({
            title: "Login Successful!",
            description: "Welcome to the Supervisor Portal.",
        });
        
        sessionStorage.setItem('userRole', result.role);
        if (result.user) {
            sessionStorage.setItem('user', JSON.stringify(result.user));
        }

        router.push('/supervisor/dashboard');

      } else {
        throw new Error(result.error || "Invalid credentials for this portal.");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center text-center mb-8">
            <h1 className="text-4xl font-bold text-primary tracking-tight">
              Supervisor Portal
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Please log in to continue.
            </p>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Supervisor Login</CardTitle>
                <CardDescription>Enter your credentials to access the Supervisor Portal.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <User className="h-4 w-4" /> Username
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your username" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="flex items-center gap-2">
                                <Lock className="h-4 w-4" /> Password
                            </FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                            </>
                        ) : (
                            <>
                                Login <LogIn className="ml-2" />
                            </>
                        )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
        
        <div className="text-center mt-8">
            <Button asChild variant="link">
                <Link href="/login">
                   <ChevronLeft className="mr-2 h-4 w-4" /> Back to All Logins
                </Link>
            </Button>
        </div>
      </div>
    </main>
  );
}
