
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import type { Course, RecordedSession, Subject } from '@/lib/types';
import { getCourseById, getRecordedSessions } from '@/app/actions';
import { Loader2, BookOpen, ChevronLeft, Video, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

export default function CoursePage() {
    const { courseId } = useParams() as { courseId: string };
    const [course, setCourse] = useState<Course | null>(null);
    const [sessions, setSessions] = useState<RecordedSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [courseData, sessionsData] = await Promise.all([
                getCourseById(courseId),
                getRecordedSessions(),
            ]);

            if (!courseData) {
                notFound();
            }

            setCourse(courseData);
            setSessions(sessionsData.filter(s => s.courseId === courseId));
            setLoading(false);
        }
        fetchData();
    }, [courseId]);

    const subjectsToDisplay = useMemo(() => {
        if (!course) return [];
        if (selectedSubject === 'all') {
            return course.subjects;
        }
        return course.subjects.filter(s => s.id === selectedSubject);
    }, [course, selectedSubject]);

    const filteredSessions = useMemo(() => {
        if (selectedSubject === 'all') {
            return sessions;
        }
        return sessions.filter(session => session.subjectId === selectedSubject);
    }, [sessions, selectedSubject]);


    if (loading) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                 <Skeleton className="h-10 w-40 mb-8" />
                 <div className="flex gap-4 mb-8">
                     <Skeleton className="h-16 w-16" />
                     <div className="space-y-2">
                        <Skeleton className="h-10 w-80" />
                        <Skeleton className="h-6 w-96" />
                     </div>
                 </div>
                 <Skeleton className="h-10 w-full mb-6" />
                 <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        )
    }

    if (!course) {
        return notFound();
    }

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <Button asChild variant="outline">
                    <Link href="/LMS">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to All Courses
                    </Link>
                </Button>
            </div>
            <div className="flex items-start gap-4 mb-8">
                 <div className="bg-primary/10 p-3 rounded-lg">
                    <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">{course.name}</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Browse recordings for this course. Select a subject to filter the list.
                    </p>
                </div>
            </div>

            <Tabs value={selectedSubject} onValueChange={setSelectedSubject}>
                <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:w-auto lg:grid-cols-none">
                    <TabsTrigger value="all">All Recordings</TabsTrigger>
                    {course.subjects.map(subject => (
                        <TabsTrigger key={subject.id} value={subject.id}>{subject.name}</TabsTrigger>
                    ))}
                </TabsList>
                
                 <div className="mt-6">
                    {filteredSessions.length > 0 ? (
                        <div className="space-y-8">
                            {subjectsToDisplay.map(subject => {
                                const unitsWithSessions = subject.units.filter(u => sessions.some(s => s.unitId === u.id && s.subjectId === subject.id));
                                if (unitsWithSessions.length === 0) return null;

                                return (
                                    <div key={subject.id}>
                                        {selectedSubject === 'all' && (
                                            <>
                                                <h2 className="text-2xl font-bold mb-4">{subject.name}</h2>
                                                <Separator className="mb-4" />
                                            </>
                                        )}
                                        <Accordion type="multiple" defaultValue={unitsWithSessions.map(u => u.id)} className="w-full space-y-4">
                                            {unitsWithSessions.map(unit => {
                                                const unitSessions = sessions.filter(s => s.unitId === unit.id);
                                                return (
                                                    <AccordionItem value={unit.id} key={unit.id} className="border rounded-lg">
                                                        <AccordionTrigger className="text-xl font-semibold px-6">{unit.title}</AccordionTrigger>
                                                        <AccordionContent className="p-4">
                                                            <div className="space-y-2">
                                                                {unitSessions.sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime()).map(session => (
                                                                    <div key={session.id} className="flex justify-between items-center p-3 hover:bg-muted/50 rounded-md">
                                                                        <div className="space-y-1">
                                                                            <p className="font-medium">{session.title}</p>
                                                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                                                <CalendarIcon className="h-4 w-4" />
                                                                                Recorded on: {format(new Date(session.recordedDate), 'PPP')}
                                                                            </p>
                                                                        </div>
                                                                        <Button asChild variant="secondary">
                                                                            <Link href={`/LMS/view-session/${session.id}`}>
                                                                                <Video className="mr-2 h-4 w-4"/> Watch
                                                                            </Link>
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                )
                                            })}
                                        </Accordion>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                         <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                            <h3 className="text-xl font-semibold">No Recordings Found</h3>
                            <p className="mt-2">There are no recordings for this subject yet.</p>
                        </div>
                    )}
                </div>
            </Tabs>
        </main>
    )
}
