
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Batch, Participant, Trainer, Course, SuperAdmin, OrganizationAdmin } from '@/lib/types';
import { getBatches, getParticipants, getCourses } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Presentation, BookUser, UserCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';


export default function OrganizationDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const organizationName = useMemo(() => decodeURIComponent(params.organizationName as string), [params.organizationName]);

    // Data states
    const [batches, setBatches] = useState<Batch[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    
    // Auth and loading states
    const [isClient, setIsClient] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<OrganizationAdmin | null>(null);
    const [loading, setLoading] = useState(true);

    const { toast } = useToast();

    const fetchOrganizationData = useCallback(async () => {
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
        }).map(batch => ({
            ...batch,
            registrations: batch.registrations.filter(reg => orgParticipants.some(p => p.iitpNo === reg.iitpNo))
        }));

        setBatches(orgBatches);
        setCourses(allCourses);
        setLoading(false);
    }, [organizationName]);

    useEffect(() => {
        setIsClient(true);
        const role = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (role === 'organization-admin' && userJson) {
            const user = JSON.parse(userJson) as OrganizationAdmin;
            if (user.organizationName === organizationName) {
                setIsAuthenticated(true);
                setCurrentUser(user);
                fetchOrganizationData();
            } else {
                 router.push('/login');
            }
        } else {
            router.push('/login');
        }
    }, [organizationName, fetchOrganizationData, router]);

    const stats = useMemo(() => {
        const totalParticipants = participants.length;
        const totalTrainingSessions = new Set(batches.map(b => b.id)).size;

        const courseEnrollments: { [courseName: string]: { enrollments: number; sessions: number; } } = {};

        courses.forEach(course => {
            courseEnrollments[course.name] = { enrollments: 0, sessions: 0 };
        });

        participants.forEach(p => {
            p.enrolledCourses?.forEach(enrolledCourseName => {
                if (courseEnrollments[enrolledCourseName]) {
                    courseEnrollments[enrolledCourseName].enrollments += 1;
                }
            })
        });

        batches.forEach(batch => {
            if (courseEnrollments[batch.course]) {
                courseEnrollments[batch.course].sessions += 1;
            }
        });

        return { totalParticipants, totalTrainingSessions, courseEnrollments };
    }, [participants, batches, courses]);


    if (!isClient || loading || !isAuthenticated) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }
    
    return (
        <>
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    Overview
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    View your organization's training and attendance data.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Organization Stats</CardTitle>
                    <CardDescription>A quick look at your organization's training data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-primary" />
                            <p className="text-2xl font-bold">{stats.totalParticipants}</p>
                            <p className="text-sm text-muted-foreground">Total Participants</p>
                            </div>
                        </Card>
                        <Card className="p-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                                <Presentation className="h-8 w-8 text-primary" />
                                <p className="text-2xl font-bold">{stats.totalTrainingSessions}</p>
                                <p className="text-sm text-muted-foreground">Training Sessions</p>
                            </div>
                        </Card>
                    </div>
                    <Separator />
                    <h3 className="text-lg font-medium">Course Statistics</h3>
                        <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Enrollments</TableHead>
                                    <TableHead>Sessions Attended</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {Object.entries(stats.courseEnrollments).length > 0 ? (
                                Object.entries(stats.courseEnrollments).filter(([,stats]) => stats.enrollments > 0 || stats.sessions > 0).map(([name, stats]) => (
                                    <TableRow key={name}>
                                        <TableCell className="font-medium">{name}</TableCell>
                                        <TableCell>{stats.enrollments}</TableCell>
                                        <TableCell>{stats.sessions}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">No course data.</TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}
