
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book } from 'lucide-react';
import { GraduationCap } from 'lucide-react';

export default function LMSAdminDashboard() {
  return (
    <div>
        <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">LMS Dashboard</h1>
            <p className="mt-2 text-lg text-muted-foreground">
                Manage your Learning Management System content.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>LMS Course Management</CardTitle>
                    <CardDescription>Manage LMS courses, curriculum, and lessons.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/LMS/admin/courses">
                            <Book className="mr-2 h-4 w-4" /> Manage Courses
                        </Link>
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Exam Management</CardTitle>
                    <CardDescription>Manage exams associated with LMS courses.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full" variant="secondary">
                        <Link href="/admin/exams">
                            <GraduationCap className="mr-2 h-4 w-4" /> Manage Exams
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
