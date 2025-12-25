
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Batch, Participant, Trainer, Course, Organization, Supervisor } from '@/lib/types';
import { getBatches, getParticipants, getTrainers, getCourses } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Presentation, BookOpen, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

export default function SupervisorReportsPage() {
    const router = useRouter();
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [fetchedBatches, fetchedParticipants, fetchedCourses] = await Promise.all([
                getBatches(),
                getParticipants(),
                getCourses(),
            ]);
            setBatches(fetchedBatches);
            setParticipants(fetchedParticipants);
            setCourses(fetchedCourses);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error fetching data',
                description: 'Could not load reports data. Please try again later.'
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const userRole = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');
        
        if (userRole === 'supervisor' && userJson) {
            const supervisorData = JSON.parse(userJson) as Supervisor;
            setSupervisor(supervisorData);
            fetchData();
        } else {
            router.push('/supervisor-login');
        }
    }, [fetchData, router]);
    
    const reportStats = useMemo(() => {
        if (!participants.length) {
            return {
                totalParticipants: 0,
                totalSessions: 0,
                totalCourses: 0,
                admissionsByYear: [],
                courseStats: [],
            };
        }

        const admissionsByYear: { [year: string]: number } = {};
        const courseEnrollments: { [courseName: string]: Set<string> } = {};
        
        participants.forEach(p => {
            const year = p.year || 'N/A';
            admissionsByYear[year] = (admissionsByYear[year] || 0) + 1;

            p.enrolledCourses?.forEach(courseName => {
                if (!courseEnrollments[courseName]) {
                    courseEnrollments[courseName] = new Set();
                }
                courseEnrollments[courseName].add(p.id);
            });
        });

        const courseSessions: { [courseName: string]: Set<string> } = {};
        batches.forEach(batch => {
            if (!courseSessions[batch.course]) {
                courseSessions[batch.course] = new Set();
            }
            courseSessions[batch.course].add(batch.id);
        });

        const courseStats = courses
            .map(c => ({
                name: c.name,
                enrollments: courseEnrollments[c.name]?.size || 0,
                sessions: courseSessions[c.name]?.size || 0,
            })).sort((a,b) => b.enrollments - a.enrollments);

        const totalCourses = Object.keys(courseEnrollments).length;

        return {
            totalParticipants: participants.length,
            totalSessions: batches.length,
            totalCourses,
            admissionsByYear: Object.entries(admissionsByYear)
                .map(([year, count]) => ({ year, count }))
                .sort((a, b) => b.year.localeCompare(a.year)),
            courseStats,
        };

    }, [participants, batches, courses]);


    if (loading) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <Button asChild variant="outline">
                    <Link href="/supervisor/dashboard">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
            <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Reports for {supervisor?.organization}</CardTitle>
                        <CardDescription>A high-level overview of all training statistics.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            <StatCard title="Total Trainees" value={reportStats.totalParticipants} icon={Users} />
                            <StatCard title="Total Sessions Conducted" value={reportStats.totalSessions} icon={Presentation} />
                            <StatCard title="Active Courses" value={reportStats.totalCourses} icon={BookOpen} />
                        </div>
                    </CardContent>
                </Card>
                <div className="grid gap-8 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Admissions by Year</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Year</TableHead>
                                            <TableHead className="text-right">Participants</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportStats.admissionsByYear.length > 0 ? reportStats.admissionsByYear.map(item => (
                                            <TableRow key={item.year}>
                                                <TableCell className="font-medium">{item.year}</TableCell>
                                                <TableCell className="text-right">{item.count}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={2} className="h-24 text-center">No admission data.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Course Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Course</TableHead>
                                            <TableHead className="text-right">Enrollments</TableHead>
                                            <TableHead className="text-right">Sessions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportStats.courseStats.length > 0 ? reportStats.courseStats.map(item => (
                                            <TableRow key={item.name}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-right">{item.enrollments}</TableCell>
                                                <TableCell className="text-right">{item.sessions}</TableCell>
                                            </TableRow>
                                        )) : (
                                             <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">No course data.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
