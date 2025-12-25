
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Batch, Participant, Trainer, Course, Organization, Supervisor } from '@/lib/types';
import { getBatches, getParticipantsByOrganization, getTrainers, getCourses } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Presentation, Building, UserCog, BookCopy, ChevronLeft, Filter, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function SupervisorReportsPage() {
    const router = useRouter();
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const [courseFilter, setCourseFilter] = useState('all');

    const { toast } = useToast();

    const fetchAllData = useCallback(async (organization: string) => {
        setLoading(true);
        const [fetchedBatches, fetchedParticipants, fetchedTrainers, fetchedCourses] = await Promise.all([
            getBatches(),
            getParticipantsByOrganization(organization),
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
        const userRole = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');
        
        if (userRole !== 'supervisor' || !userJson) {
            router.push('/login');
            return;
        }
        
        const supervisorData = JSON.parse(userJson) as Supervisor;
        setSupervisor(supervisorData);

        if (supervisorData.organization) {
            fetchAllData(supervisorData.organization);
        } else {
            setLoading(false);
            toast({
                variant: 'destructive',
                title: 'No Organization Found',
                description: 'Your account is not associated with an organization.'
            });
        }
    }, [fetchAllData, router, toast]);
    
    const filteredParticipants = useMemo(() => {
        return participants.filter(p => {
            const courseMatch = courseFilter === 'all' || p.enrolledCourses?.includes(courseFilter);
            return courseMatch;
        });
    }, [participants, courseFilter]);

    const reportStats = useMemo(() => {
        let totalEnrollments = 0;
        const admissionStats: { [key: string]: { year: string, season: string, semester: string, count: number } } = {};

        filteredParticipants.forEach(participant => {
            participant.enrolledCourses?.forEach(() => {
                totalEnrollments++;
            });

            const year = participant.year || 'N/A';
            const season = participant.enrollmentSeason || 'N/A';
            const semester = participant.semester || 'N/A';
            const key = `${year}-${season}-${semester}`;
            
            if (admissionStats[key]) {
                admissionStats[key].count++;
            } else {
                admissionStats[key] = { year, season, semester, count: 1 };
            }
        });

        const sortedAdmissionStats = Object.values(admissionStats).sort((a, b) => {
            if (a.year !== b.year) return b.year.localeCompare(a.year);
            if (a.season !== b.season) return a.season.localeCompare(b.season);
            return a.semester.localeCompare(b.semester);
        });

        return {
            totalParticipants: filteredParticipants.length,
            totalSessions: batches.length, // Can be improved to filter by org
            totalTrainers: trainers.length, // This is global, might need adjustment
            admissionStats: sortedAdmissionStats,
        };
    }, [filteredParticipants, batches, trainers]);

    const downloadCsv = (data: any[], filename: string) => {
        if (data.length === 0) {
            toast({ variant: 'destructive', title: 'No data to export' });
            return;
        }
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = String(row[header] ?? '');
                    return `"${value.replace(/"/g, '""')}"`;
                }).join(',')
            )
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `${filename}.csv`);
        a.click();
        toast({ title: 'Export Complete', description: `${filename}.csv has been downloaded.` });
    };

    const handleExportParticipants = () => {
        const dataToExport = filteredParticipants.map(p => ({
            id: p.id, name: p.name, iitpNo: p.iitpNo, mobile: p.mobile, organization: p.organization, createdAt: p.createdAt,
            enrolledCourses: p.enrolledCourses?.join('; ') || '',
        }));
        downloadCsv(dataToExport, `${supervisor?.organization}_participants`);
    };

    const handleExportTrainings = () => {
        const dataToExport: any[] = [];
        const orgTraineeIitpNos = new Set(participants.map(p => p.iitpNo));

        batches.forEach(batch => {
            const orgRegistrations = batch.registrations.filter(reg => orgTraineeIitpNos.has(reg.iitpNo));
            if (orgRegistrations.length > 0) {
                orgRegistrations.forEach(reg => {
                    dataToExport.push({
                        batchId: batch.id, batchName: batch.name, course: batch.course, batchStartDate: batch.startDate,
                        trainerName: trainers.find(t => t.id === batch.trainerId)?.name || '', isCancelled: batch.isCancelled,
                        participantName: reg.name, participantIitpNo: reg.iitpNo, registrationTime: reg.submissionTime
                    });
                });
            }
        });
        downloadCsv(dataToExport, `${supervisor?.organization}_trainings`);
    };

    if (loading) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }

    return (
        <main>
            <div className="mb-6 mt-6">
                <Button asChild variant="outline">
                    <Link href="/supervisor/dashboard">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Reports for {supervisor?.organization}</CardTitle>
                        <CardDescription>A high-level overview of your organization's training statistics.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                 <div>
                                    <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5"/> Filters</CardTitle>
                                    <CardDescription>Refine the data shown in the statistics below.</CardDescription>
                                 </div>
                                  <Button variant="outline" size="sm" onClick={() => {setCourseFilter('all')}}>
                                    <X className="mr-2 h-4 w-4"/> Clear Filters
                                  </Button>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Course</Label>
                                    <Select value={courseFilter} onValueChange={setCourseFilter}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Courses</SelectItem>
                                             {courses.map(course => <SelectItem key={course.id} value={course.name}>{course.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card className="p-4 text-center"><div className="flex flex-col items-center gap-2"><Users className="h-8 w-8 text-primary" /><p className="text-2xl font-bold">{reportStats.totalParticipants}</p><p className="text-sm text-muted-foreground">Filtered Participants</p></div></Card>
                            <Card className="p-4 text-center"><div className="flex flex-col items-center gap-2"><Presentation className="h-8 w-8 text-primary" /><p className="text-2xl font-bold">{reportStats.totalSessions}</p><p className="text-sm text-muted-foreground">Total Sessions</p></div></Card>
                        </div>
                        <Separator />
                        <div>
                            <h3 className="text-lg font-medium mb-4">Year-Season-Semester Wise Admission Stats</h3>
                            <div className="border rounded-lg max-h-96 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Season</TableHead>
                                            <TableHead>Semester</TableHead>
                                            <TableHead className="text-right">Participants</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportStats.admissionStats.length > 0 ? (
                                            reportStats.admissionStats.map((stat) => (
                                            <TableRow key={`${stat.year}-${stat.season}-${stat.semester}`}>
                                                <TableCell>{stat.year}</TableCell>
                                                <TableCell>{stat.season}</TableCell>
                                                <TableCell>{stat.semester}</TableCell>
                                                <TableCell className="text-right font-medium">{stat.count}</TableCell>
                                            </TableRow>
                                        ))
                                        ) : (
                                             <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No admission data for the current filter.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Data Exports</CardTitle>
                        <CardDescription>Download your organization's data as CSV files. Exports will respect the filters set above.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" onClick={handleExportParticipants}><Users className="mr-2"/> Export Participants</Button>
                        <Button variant="outline" onClick={handleExportTrainings}><Presentation className="mr-2"/> Export Trainings</Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
