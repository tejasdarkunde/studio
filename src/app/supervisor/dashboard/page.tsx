
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Presentation, BookOpen, UserCheck, UserX, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Participant, Supervisor, Batch, Course } from '@/lib/types';
import { getParticipantsByOrganization, getBatches, getCourses } from '@/app/actions';

export default function SupervisorDashboardPage() {
    const router = useRouter();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userRole = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (userRole === 'supervisor' && userJson) {
            const currentUser = JSON.parse(userJson) as Supervisor;
            setSupervisor(currentUser);
            
            const fetchData = async () => {
                if (currentUser.organization) {
                    const [participantData, batchData, courseData] = await Promise.all([
                        getParticipantsByOrganization(currentUser.organization),
                        getBatches(),
                        getCourses()
                    ]);
                    setParticipants(participantData);
                    setBatches(batchData);
                    setCourses(courseData);
                }
                setLoading(false);
            }
            fetchData();

        } else {
            router.push('/supervisor-login');
        }
    }, [router]);

    const stats = useMemo(() => {
        const totalTrainees = participants.length;

        const enrolledCourseNames = new Set(participants.flatMap(p => p.enrolledCourses || []));
        const activeCourses = enrolledCourseNames.size;

        const registeredBatchIds = new Set<string>();
        const participantIitpNos = new Set(participants.map(p => p.iitpNo));

        batches.forEach(batch => {
            const hasOrgParticipant = batch.registrations.some(reg => participantIitpNos.has(reg.iitpNo));
            if (hasOrgParticipant) {
                 registeredBatchIds.add(batch.id);
            }
        });
        const totalBatches = registeredBatchIds.size;

        return {
            totalTrainees,
            activeCourses,
            totalBatches
        };
    }, [participants, batches]);

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
                Submit new admission forms or view the status of existing trainees for {supervisor?.organization}.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Trainees</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalTrainees}</div>
                    <p className="text-xs text-muted-foreground">in your organization</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.activeCourses}</div>
                    <p className="text-xs text-muted-foreground">Trainees are enrolled in</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                    <Presentation className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalBatches}</div>
                    <p className="text-xs text-muted-foreground">attended by trainees</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Left Trainees</CardTitle>
                    <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-xs text-muted-foreground">(Feature coming soon)</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/supervisor/new-admission">
                <Card className="hover:bg-secondary transition-colors h-full">
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
                <Card className="hover:bg-secondary transition-colors h-full">
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
