
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Batch, Participant, Trainer, Course } from '@/lib/types';
import { getBatches, getParticipants, getTrainers, getCourses } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Presentation, Building, UserCog, BookCopy, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ReportsPage() {
    const router = useRouter();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const { toast } = useToast();

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
        const role = sessionStorage.getItem('userRole');
        if (role !== 'superadmin') {
            router.push('/login');
            return;
        }
        fetchAllData();
    }, [fetchAllData, router]);

    const reportStats = useMemo(() => {
        let totalEnrollments = 0;
        const courseStats: { [courseName: string]: { enrollments: number; sessions: number; } } = {};
        const admissionStats: { [key: string]: { year: string, season: string, semester: string, count: number } } = {};

        courses.forEach(course => {
            courseStats[course.name] = { enrollments: 0, sessions: 0 };
        });
        
        participants.forEach(participant => {
            participant.enrolledCourses?.forEach(enrolledCourse => {
                if (courseStats[enrolledCourse]) {
                    courseStats[enrolledCourse].enrollments += 1;
                    totalEnrollments++;
                }
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

        batches.forEach(batch => {
            if (courseStats[batch.course]) {
                courseStats[batch.course].sessions += 1;
            }
        });

        const sortedAdmissionStats = Object.values(admissionStats).sort((a, b) => {
            if (a.year !== b.year) return b.year.localeCompare(a.year);
            if (a.season !== b.season) return a.season.localeCompare(b.season);
            return a.semester.localeCompare(b.semester);
        });

        return {
            totalParticipants: participants.length,
            totalSessions: batches.length,
            totalTrainers: trainers.length,
            courseStats,
            admissionStats: sortedAdmissionStats,
        };
    }, [participants, batches, trainers, courses]);

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
        const dataToExport = participants.map(p => ({
            id: p.id, name: p.name, iitpNo: p.iitpNo, mobile: p.mobile, organization: p.organization, createdAt: p.createdAt,
            enrolledCourses: p.enrolledCourses?.join('; ') || '',
        }));
        downloadCsv(dataToExport, 'all_participants');
    };

    const handleExportTrainings = () => {
        const dataToExport: any[] = [];
        batches.forEach(batch => {
            batch.registrations.forEach(reg => {
                dataToExport.push({
                    batchId: batch.id, batchName: batch.name, course: batch.course, batchStartDate: batch.startDate,
                    trainerName: trainers.find(t => t.id === batch.trainerId)?.name || '', isCancelled: batch.isCancelled,
                    participantName: reg.name, participantIitpNo: reg.iitpNo, registrationTime: reg.submissionTime
                });
            });
        });
        downloadCsv(dataToExport, 'all_trainings_with_registrations');
    };

    const handleExportCourses = () => {
        const dataToExport: any[] = [];
        courses.forEach(course => {
            course.subjects.forEach(subject => {
                subject.units.forEach(unit => {
                    unit.lessons.forEach(lesson => {
                        dataToExport.push({
                            courseName: course.name, subjectName: subject.name, unitTitle: unit.title,
                            lessonTitle: lesson.title, lessonDuration: lesson.duration, lessonVideoUrl: lesson.videoUrl,
                        });
                    });
                });
            });
        });
        downloadCsv(dataToExport, 'all_course_structures');
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
            <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Reports & Statistics</CardTitle>
                        <CardDescription>A high-level overview of your training statistics.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card className="p-4 text-center"><div className="flex flex-col items-center gap-2"><Users className="h-8 w-8 text-primary" /><p className="text-2xl font-bold">{reportStats.totalParticipants}</p><p className="text-sm text-muted-foreground">Total Participants</p></div></Card>
                            <Card className="p-4 text-center"><div className="flex flex-col items-center gap-2"><Presentation className="h-8 w-8 text-primary" /><p className="text-2xl font-bold">{reportStats.totalSessions}</p><p className="text-sm text-muted-foreground">Total Sessions</p></div></Card>
                            <Card className="p-4 text-center"><div className="flex flex-col items-center gap-2"><UserCog className="h-8 w-8 text-primary" /><p className="text-2xl font-bold">{reportStats.totalTrainers}</p><p className="text-sm text-muted-foreground">Registered Trainers</p></div></Card>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                            {reportStats.admissionStats.map((stat) => (
                                                <TableRow key={`${stat.year}-${stat.season}-${stat.semester}`}>
                                                    <TableCell>{stat.year}</TableCell>
                                                    <TableCell>{stat.season}</TableCell>
                                                    <TableCell>{stat.semester}</TableCell>
                                                    <TableCell className="text-right font-medium">{stat.count}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium mb-4">Course-wise Participants</h3>
                                <div className="border rounded-lg max-h-96 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Course</TableHead>
                                                <TableHead>Enrollments</TableHead>
                                                <TableHead>Sessions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(reportStats.courseStats).length > 0 ? (
                                                Object.entries(reportStats.courseStats).map(([name, stats]) => (
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
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Data Exports</CardTitle>
                        <CardDescription>Download your core application data as CSV files.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button variant="outline" onClick={handleExportParticipants}><Users className="mr-2"/> Export Participants</Button>
                        <Button variant="outline" onClick={handleExportTrainings}><Presentation className="mr-2"/> Export Trainings</Button>
                        <Button variant="outline" onClick={handleExportCourses}><BookCopy className="mr-2"/> Export Courses</Button>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
