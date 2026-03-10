"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import type { Course, RecordedSession, Subject } from '@/lib/types';
import { getCourseById, getRecordedSessions } from '@/app/actions';
import { Loader2, BookOpen, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Video } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

const SessionCard = ({ session }: { session: RecordedSession }) => {
    const imageUrl = `https://picsum.photos/seed/${session.id.replace(/-/g, '')}/600/400`;
    return (
        <Card className="flex flex-col overflow-hidden">
             <div className="relative h-40 w-full">
                <Image
                    src={imageUrl}
                    alt={session.title}
                    fill
                    className="object-cover"
                    data-ai-hint="technology abstract"
                />
            </div>
            <CardHeader>
                <CardTitle className="line-clamp-2">{session.title}</CardTitle>
                <CardDescription>Recorded on: {format(new Date(session.recordedDate), 'PPP')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{session.description || 'No description provided.'}</p>
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full">
                    <Link href={`/LMS/view-session/${session.id}`}>
                        <Video className="mr-2 h-4 w-4"/> Watch Session
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}

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
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <Skeleton className="h-40 w-full" />
                            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                            <CardContent className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </CardContent>
                            <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                        </Card>
                    ))}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredSessions.sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime()).map(session => (
                                <SessionCard key={session.id} session={session} />
                            ))}
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
