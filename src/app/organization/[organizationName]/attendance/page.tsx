
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Batch, Participant, Course, OrganizationAdmin } from '@/lib/types';
import { getBatches, getParticipants, getCourses } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceReport } from '@/components/features/attendance-report';

export default function OrganizationAttendancePage() {
    const router = useRouter();
    const params = useParams();
    const organizationName = useMemo(() => decodeURIComponent(params.organizationName as string), [params.organizationName]);

    const [batches, setBatches] = useState<Batch[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchAttendanceData = useCallback(async () => {
        setLoading(true);
        const [allParticipants, allBatches, allCourses] = await Promise.all([
            getParticipants(),
            getBatches(),
            getCourses()
        ]);

        const orgParticipants = allParticipants.filter(p => p.organization === organizationName);
        setParticipants(orgParticipants);
        
        const orgBatches = allBatches.filter(batch => {
            return batch.organizations?.includes(organizationName) || batch.registrations.some(reg => orgParticipants.some(p => p.iitpNo === reg.iitpNo));
        });

        setBatches(orgBatches);
        setCourses(allCourses);
        setLoading(false);
    }, [organizationName]);

    useEffect(() => {
        const role = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (role === 'organization-admin' && userJson) {
            const user = JSON.parse(userJson) as OrganizationAdmin;
            if (user.organizationName === organizationName) {
                setIsAuthenticated(true);
                fetchAttendanceData();
            } else {
                 router.push('/admin-login');
            }
        } else {
            router.push('/admin-login');
        }
    }, [organizationName, fetchAttendanceData, router]);

    if (loading || !isAuthenticated) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }
    
    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    Attendance
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Grid view of attendance for your organization's participants.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Report</CardTitle>
                    <CardDescription>View a consolidated report of participant attendance across different training sessions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AttendanceReport 
                        participants={participants}
                        batches={batches}
                        courses={courses}
                    />
                </CardContent>
            </Card>
        </>
    )
}
