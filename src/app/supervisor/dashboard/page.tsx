
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2, BookOpen, Presentation, BarChart } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Participant, Supervisor, Batch, Course } from '@/lib/types';
import { getParticipantsByOrganization, getBatches, getCourses } from '@/app/actions';
import { Button } from '@/components/ui/button';

const StatCard = ({ title, value, description, icon: Icon }: { title: string, value: number | string, description: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);


export default function SupervisorDashboardPage() {
    const router = useRouter();
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (org: string) => {
        setLoading(true);
        const [fetchedParticipants, fetchedBatches, fetchedCourses] = await Promise.all([
            getParticipantsByOrganization(org),
            getBatches(),
            getCourses(),
        ]);
        setParticipants(fetchedParticipants);
        setBatches(fetchedBatches);
        setCourses(fetchedCourses);
        setLoading(false);
    }, []);

    useEffect(() => {
        const userRole = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (userRole === 'supervisor' && userJson) {
            const currentUser = JSON.parse(userJson) as Supervisor;
            setSupervisor(currentUser);

            if (currentUser.organization) {
                fetchData(currentUser.organization);
            } else {
                setLoading(false);
            }
        } else {
            router.push('/supervisor-login');
        }
    }, [router, fetchData]);


    const stats = useMemo(() => {
        if (!supervisor?.organization || loading) {
            return { totalTrainees: 0, activeCourses: 0, totalBatches: 0 };
        }

        const traineeIitpNos = new Set(participants.map(p => p.iitpNo));

        const organizationBatches = batches.filter(batch => {
            if (batch.organizations?.includes(supervisor.organization!)) {
                return true;
            }
            // Fallback for older batches: check if any of the organization's participants are registered
            return batch.registrations.some(reg => traineeIitpNos.has(reg.iitpNo));
        });

        const activeCourseNames = new Set<string>();
        participants.forEach(p => {
            p.enrolledCourses?.forEach(courseName => activeCourseNames.add(courseName));
        });

        return {
            totalTrainees: participants.length,
            activeCourses: activeCourseNames.size,
            totalBatches: organizationBatches.length
        };
    }, [participants, batches, supervisor, loading]);


    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="p-4 md:p-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
            <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
                An overview of trainees for {supervisor?.organization}.
            </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard title="Total Trainees" value={stats.totalTrainees} description="in your organization" icon={Users} />
            <StatCard title="Active Courses" value={stats.activeCourses} description="Trainees are enrolled in" icon={BookOpen} />
            <StatCard title="Total Batches" value={stats.totalBatches} description="attended by trainees" icon={Presentation} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View, add, or update trainees in your organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/supervisor/users">
                            <Users className="mr-2 h-4 w-4" /> Manage Trainees
                        </Link>
                    </Button>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Reports & Exports</CardTitle>
                    <CardDescription>View detailed reports and export data for your organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/supervisor/reports">
                            <BarChart className="mr-2 h-4 w-4" /> View Reports
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
