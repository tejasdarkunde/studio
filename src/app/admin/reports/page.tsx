
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Batch, Participant, Trainer, Course, Organization } from '@/lib/types';
import { getBatches, getParticipants, getTrainers, getCourses, getOrganizations } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Presentation, Building, UserCog, BookCopy, ChevronLeft, Filter, X, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';


const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

export default function ReportsPage() {
    const router = useRouter();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    const { toast } = useToast();

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const [fetchedBatches, fetchedParticipants, fetchedTrainers, fetchedCourses, fetchedOrganizations] = await Promise.all([
            getBatches(),
            getParticipants(),
            getTrainers(),
            getCourses(),
            getOrganizations(),
        ]);
        setBatches(fetchedBatches);
        setParticipants(fetchedParticipants);
        setTrainers(fetchedTrainers);
        setCourses(fetchedCourses);
        setOrganizations(fetchedOrganizations);
        setLoading(false);
    }, []);
    
    useEffect(() => {
        const role = sessionStorage.getItem('userRole');
        if (role !== 'superadmin') {
            router.push('/login');
            return;
        }
        fetchAllData();
    }, [fetchAllData, router]);
    
    const reportStats = useMemo(() => {
        const admissionsByOrg: { [org: string]: number } = {};
        const admissionsByYear: { [year: string]: number } = {};
        const courseEnrollments: { [courseName: string]: Set<string> } = {};
        const courseSessions: { [courseName: string]: Set<string> } = {};

        participants.forEach(p => {
            const org = p.organization || 'N/A';
            admissionsByOrg[org] = (admissionsByOrg[org] || 0) + 1;

            const year = p.year || 'N/A';
            admissionsByYear[year] = (admissionsByYear[year] || 0) + 1;
            
            p.enrolledCourses?.forEach(courseName => {
                if (!courseEnrollments[courseName]) {
                    courseEnrollments[courseName] = new Set();
                }
                courseEnrollments[courseName].add(p.id);
            });
        });
        
        batches.forEach(batch => {
            if (!courseSessions[batch.course]) {
                courseSessions[batch.course] = new Set();
            }
            courseSessions[batch.course].add(batch.id);
        });
        
        const courseStats = courses.map(c => ({
            name: c.name,
            enrollments: courseEnrollments[c.name]?.size || 0,
            sessions: courseSessions[c.name]?.size || 0,
        })).sort((a,b) => b.enrollments - a.enrollments);

        return {
            totalParticipants: participants.length,
            totalSessions: batches.length,
            totalOrganizations: organizations.length,
            totalTrainers: trainers.length,
            admissionsByOrg: Object.entries(admissionsByOrg).map(([org, count]) => ({ org, count })).sort((a, b) => b.count - a.count),
            admissionsByYear: Object.entries(admissionsByYear).map(([year, count]) => ({ year, count })).sort((a, b) => b.year.localeCompare(a.year)),
            courseStats,
        };
    }, [participants, batches, trainers, courses, organizations]);

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
                    <Link href="/admin">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Reports</CardTitle>
                        <CardDescription>A high-level overview of your training statistics.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <StatCard title="Total Participants" value={reportStats.totalParticipants} icon={Users} />
                            <StatCard title="Total Sessions Conducted" value={reportStats.totalSessions} icon={Presentation} />
                            <StatCard title="Unique Organizations" value={reportStats.totalOrganizations} icon={Building} />
                            <StatCard title="Registered Trainers" value={reportStats.totalTrainers} icon={UserCog} />
                        </div>
                    </CardContent>
                </Card>
                <div className="grid gap-8 md:grid-cols-3">
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle>Admissions by Organization</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Organization</TableHead>
                                            <TableHead className="text-right">Participants</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportStats.admissionsByOrg.map(item => (
                                            <TableRow key={item.org}>
                                                <TableCell className="font-medium">{item.org}</TableCell>
                                                <TableCell className="text-right">{item.count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-1">
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
                                        {reportStats.admissionsByYear.map(item => (
                                            <TableRow key={item.year}>
                                                <TableCell className="font-medium">{item.year}</TableCell>
                                                <TableCell className="text-right">{item.count}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                     <Card className="md:col-span-1">
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
                                        {reportStats.courseStats.map(item => (
                                            <TableRow key={item.name}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-right">{item.enrollments}</TableCell>
                                                <TableCell className="text-right">{item.sessions}</TableCell>
                                            </TableRow>
                                        ))}
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
