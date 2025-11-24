
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Batch, Participant, Trainer, Course } from '@/lib/types';
import { getBatches, getParticipants, getTrainers, getCourses } from '@/app/actions';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdvancedAttendanceExport } from '@/components/features/advanced-attendance-export';
import { AttendanceReport } from '@/components/features/attendance-report';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AttendancePage() {
    const router = useRouter();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'superadmin' | 'trainer' | null>(null);
    const [trainerId, setTrainerId] = useState<string | null>(null);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const [fetchedBatches, fetchedParticipants, fetchedTrainers, fetchedCourses] = await Promise.all([
            getBatches(),
            getParticipants(),
            getTrainers(),
            getCourses(),
        ]);

        setBatches(fetchedBatches);
        setParticipants(fetchedParticipants);
        setTrainers(fetchedTrainers);
        setCourses(fetchedCourses);
        setLoading(false);
    }, []);

    useEffect(() => {
        const role = sessionStorage.getItem('userRole') as 'superadmin' | 'trainer' | null;
        const id = sessionStorage.getItem('trainerId');

        if (role) {
            setUserRole(role);
            if (role === 'trainer' && id) {
                setTrainerId(id);
            }
            fetchAllData();
        } else {
            router.push('/login');
        }
    }, [fetchAllData, router]);

    const filteredBatches = userRole === 'trainer' && trainerId
        ? batches.filter(batch => batch.trainerId === trainerId)
        : batches;
        
    if(loading) {
        return (
             <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        )
    }

    return (
        <main>
            <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Report</CardTitle>
                    <CardDescription>View and export participant attendance for specific courses, trainers, and date ranges.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <AdvancedAttendanceExport
                        batches={filteredBatches}
                        trainers={trainers}
                        courses={courses}
                    />
                    <Separator />
                    <AttendanceReport
                        participants={participants}
                        batches={filteredBatches}
                        courses={courses}
                    />
                </CardContent>
            </Card>
        </main>
    );
}
