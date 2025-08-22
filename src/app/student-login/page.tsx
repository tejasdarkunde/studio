
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { StudentLoginForm } from '@/components/features/student-login-form';

export default function StudentLoginPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleLoginSuccess = () => {
    toast({
      title: "Login Successful!",
      description: "Welcome back. Redirecting you to your courses...",
    });
    router.push('/student/courses');
  };

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center text-center mb-8">
            <h1 className="text-4xl font-bold text-primary tracking-tight">
              Student Login
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Access your learning materials.
            </p>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access the portal.</CardDescription>
            </Header>
            <CardContent>
                <StudentLoginForm onSuccess={handleLoginSuccess} />
            </CardContent>
        </Card>
        
        <div className="text-center mt-8">
            <Link href="/" passHref>
                <button className="text-primary hover:underline">Back to Home</button>
            </Link>
        </div>
      </div>
    </main>
  );
}
