
"use client";

import { getCourseById, getParticipantByIitpNo } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { Video, BookOpen, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Course, Lesson, Participant } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoPlayer } from '@/components/features/video-player';


const CourseContentPageClient = () => {
    const params = useParams() as { iitpNo: string; courseId: string; };
    const [course, setCourse] = useState<Course | null>(null);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

    useEffect(() => {
        if (!params.courseId || !params.iitpNo) return;
        
        const fetchData = async () => {
            setLoading(true);
            const [courseData, participantData] = await Promise.all([
                getCourseById(params.courseId),
                getParticipantByIitpNo(params.iitpNo),
            ]);

            if (!participantData || !courseData) {
                notFound();
            }

            const isEnrolled = participantData.enrolledCourses?.some(enrolledCourseName =>
                courseData.name.toLowerCase() === enrolledCourseName.toLowerCase()
            );

            if (!isEnrolled) {
                notFound();
            }
            
            setCourse(courseData);
            setParticipant(participantData);
            setLoading(false);
        };
        fetchData();
    }, [params.courseId, params.iitpNo]);

    if (loading) {
        return (
             <main className="container mx-auto p-4 md:p-8">
                 <Skeleton className="h-10 w-48 mb-8" />
                 <div className="mb-12">
                     <Skeleton className="h-8 w-1/3 mb-2" />
                     <Skeleton className="h-12 w-1/2 mb-2" />
                     <Skeleton className="h-6 w-2/3" />
                 </div>
                 <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                 </div>
             </main>
        )
    }

    if (!course || !participant) {
        return notFound();
    }

    return (
        <>
            <Dialog open={!!selectedLesson} onOpenChange={(isOpen) => !isOpen && setSelectedLesson(null)}>
                <DialogContent className="max-w-4xl h-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedLesson?.title}</DialogTitle>
                    </DialogHeader>
                    {selectedLesson?.videoUrl && (
                       <VideoPlayer url={selectedLesson.videoUrl} />
                    )}
                </DialogContent>
            </Dialog>

            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-8">
                    <Button asChild variant="outline">
                        <Link href={`/student/courses/${params.iitpNo}`}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to My Courses
                        </Link>
                    </Button>
                </div>
                
                <div className="mb-12">
                    <p className="text-lg text-primary font-semibold">{course.name}</p>
                    <h1 className="text-4xl font-bold tracking-tight">Course Content</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Browse the subjects, units, and lessons for this course.</p>
                </div>

                {course.subjects.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4">
                        {course.subjects.map(subject => (
                            <AccordionItem value={subject.id} key={subject.id} className="border rounded-lg">
                                <AccordionTrigger className="p-6 hover:no-underline">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-primary/10 p-3 rounded-md">
                                        <BookOpen className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-left">{subject.name}</h2>
                                            <p className="text-sm text-muted-foreground text-left">{subject.units.length} units</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-0">
                                    {subject.units.length > 0 ? (
                                        <Accordion type="multiple" className="w-full space-y-2">
                                            {subject.units.map(unit => (
                                                <AccordionItem value={unit.id} key={unit.id} className="border-l-4 border-primary/50 pl-4">
                                                    <AccordionTrigger className="py-3 hover:no-underline">
                                                        <h3 className="text-lg font-medium">{unit.title}</h3>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pb-0">
                                                        <ul className="space-y-3 pt-2">
                                                            {unit.lessons.map(lesson => (
                                                                <li key={lesson.id} className="flex items-center justify-between p-3 rounded-md bg-background hover:bg-secondary/50 transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <Video className="h-5 w-5 text-muted-foreground" />
                                                                        <span className="text-base">{lesson.title}</span>
                                                                    </div>
                                                                    <Button size="sm" variant="ghost" onClick={() => setSelectedLesson(lesson)}>
                                                                        Watch Video
                                                                    </Button>
                                                                </li>
                                                            ))}
                                                            {unit.lessons.length === 0 && <p className="text-muted-foreground text-sm">No lessons in this unit yet.</p>}
                                                        </ul>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    ) : (
                                        <p className="text-muted-foreground">No units have been added to this subject yet.</p>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center text-muted-foreground py-16 border rounded-lg">
                        <h3 className="text-xl font-semibold text-foreground">No Content Available</h3>
                        <p className="mt-2">The curriculum for this course has not been uploaded yet.</p>
                    </div>
                )}
            </main>
        </>
    );
}


export default function CourseContentPage() {
    // This wrapper is needed because this is a server component by default,
    // but we need client-side hooks like useState and useEffect for interactivity.
    return <CourseContentPageClient />;
}
