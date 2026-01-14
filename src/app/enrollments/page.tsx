"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Form } from '@/lib/types';
import { getAllForms } from '@/app/actions';
import { Loader2, ChevronLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function EnrollmentsPage() {
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEnrollmentForms = useCallback(async () => {
        setLoading(true);
        const allForms = await getAllForms();
        // Filter for forms that are likely enrollment forms
        const enrollmentForms = allForms.filter(form => 
            form.title.toLowerCase().includes('enrollment') || 
            form.title.toLowerCase().includes('admission')
        );
        setForms(enrollmentForms);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchEnrollmentForms();
    }, [fetchEnrollmentForms]);

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <Button asChild variant="outline">
                    <Link href="/home2">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Home
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col items-center text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight">Enrollment Forms</h1>
                <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
                    Please select the appropriate form to begin your application.
                </p>
            </div>
            
            {loading ? (
                <div className="flex justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : forms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {forms.map(form => (
                        <Card key={form.id}>
                            <CardHeader>
                                <CardTitle className="flex items-start gap-3">
                                    <FileText className="h-6 w-6 mt-1 text-primary"/>
                                    <span>{form.title}</span>
                                </CardTitle>
                                {form.description && <CardDescription>{form.description}</CardDescription>}
                            </CardHeader>
                            <CardFooter>
                                <Button className="w-full" asChild>
                                    {/* This link will eventually go to /form/{form.id} */}
                                    <Link href={`/apply`}>Fill Form</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg max-w-2xl mx-auto">
                    <h3 className="text-xl font-semibold">No Enrollment Forms Found</h3>
                    <p className="mt-2">There are currently no active enrollment forms available. Please check back later.</p>
                </div>
            )}
        </main>
    );
}
