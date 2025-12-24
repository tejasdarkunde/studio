
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users } from 'lucide-react';
import Link from 'next/link';

export default function SupervisorDashboardPage() {
  return (
    <div className="p-4 md:p-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
            <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
                Submit new admission forms or view the status of existing trainees.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/supervisor/new-admission">
                <Card className="hover:bg-secondary transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-6 w-6 text-primary" />
                            New Admission Form
                        </CardTitle>
                        <CardDescription>Submit a new application for a trainee.</CardDescription>
                    </CardHeader>
                </Card>
            </Link>
             <Link href="/supervisor/trainees">
                <Card className="hover:bg-secondary transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-6 w-6 text-primary" />
                            View Trainees
                        </CardTitle>
                        <CardDescription>View all trainees submitted from your organization.</CardDescription>
                    </CardHeader>
                </Card>
            </Link>
        </div>
    </div>
  );
}
