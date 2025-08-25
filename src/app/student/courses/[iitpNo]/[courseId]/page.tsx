
"use client";

import { getCourseById, getParticipantByIitpNo, markLessonAsComplete } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { Video, BookOpen, ChevronLeft, CheckCircle2, Clock, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Course, Lesson, Participant } from '@/lib/types';
import { useEffect, useState, useTransition } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoPlayer } from '@/components/features/video-player';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


const CourseContentPageClient = () => {
    const params = useParams() as { iitpNo: string; courseId: string; };
    const [course, setCourse] = useState<Course | null>(null);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const fetchParticipantData = async () => {
        const participantData = await getParticipantByIitpNo(params.iitpNo);
         if (!participantData) {
            notFound();
        }
        setParticipant(participantData);
        return participantData;
    };

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

    const handleMarkAsComplete = (lessonId: string) => {
        if (!participant) return;

        startTransition(async () => {
            const result = await markLessonAsComplete({ participantId: participant.id, lessonId });
            if (result.success) {
                toast({
                    title: "Progress Saved!",
                    description: "Lesson marked as complete."
                });
                // Re-fetch participant data to update UI
                const updatedParticipant = await fetchParticipantData();
                // Close dialog if the completed lesson was the selected one
                if (selectedLesson && updatedParticipant?.completedLessons?.includes(selectedLesson.id)) {
                    // Do nothing, let user see the completed state in dialog
                }
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error,
                });
            }
        });
    }

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

    const completedLessonsSet = new Set(participant.completedLessons || []);
    const isLessonCompleted = selectedLesson ? completedLessonsSet.has(selectedLesson.id) : false;

    return (
        <>
            <Dialog open={!!selectedLesson} onOpenChange={(isOpen) => !isOpen && setSelectedLesson(null)}>
                <DialogContent className="max-w-4xl h-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedLesson?.title}</DialogTitle>
                         {selectedLesson?.duration && (
                            <DialogDescription className="flex items-center gap-1"><Clock className="h-4 w-4" /> {selectedLesson.duration} min</DialogDescription>
                        )}
                    </DialogHeader>
                    <div className="grid gap-4">
                        {selectedLesson?.videoUrl && (
                           <VideoPlayer url={selectedLesson.videoUrl} />
                        )}
                        {(selectedLesson?.description || selectedLesson?.documentUrl) && (
                            <div className="p-4 bg-secondary/50 rounded-md max-h-48">
                                <ScrollArea className="h-full">
                                    {selectedLesson.description && (
                                        <>
                                            <h4 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4"/> Lesson Details</h4>
                                            <p className="text-sm whitespace-pre-wrap">{selectedLesson.description}</p>
                                        </>
                                    )}
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                     <DialogFooter className="sm:justify-between items-center">
                        <div>
                        {selectedLesson?.documentUrl && (
                            <Button asChild variant="outline">
                                <Link href={selectedLesson.documentUrl} target="_blank" download>
                                    <Download className="mr-2"/> Download Document
                                </Link>
                            </Button>
                        )}
                        </div>
                        <div>
                        {isLessonCompleted ? (
                             <div className="flex items-center gap-2 text-green-600 font-semibold text-sm pr-4">
                                <CheckCircle2 className="h-5 w-5" />
                                <span>Completed</span>
                            </div>
                        ) : (
                             <Button onClick={() => selectedLesson && handleMarkAsComplete(selectedLesson.id)} disabled={isPending}>
                                {isPending ? 'Saving...' : 'Mark as Complete'}
                            </Button>
                        )}
                        </div>
                    </DialogFooter>
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
                                                                <li key={lesson.id}>
                                                                     <button 
                                                                        className="w-full flex items-center justify-between p-3 rounded-md bg-background hover:bg-secondary/50 transition-colors text-left"
                                                                        onClick={() => setSelectedLesson(lesson)}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <Video className="h-5 w-5 text-muted-foreground" />
                                                                            <div className="flex flex-col items-start">
                                                                                <span className="text-base font-medium">{lesson.title}</span>
                                                                                {lesson.duration && (
                                                                                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {lesson.duration} min</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {completedLessonsSet.has(lesson.id) && (
                                                                            <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                                                                                <CheckCircle2 className="h-5 w-5" />
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                </li>
                                                            ))}
                                                            {unit.lessons.length === 0 && <p className="text-muted-foreground text-sm p-3">No lessons in this unit yet.</p>}
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


export default function CourseContentPage({ params }: { params: { iitpNo: string; courseId: string; } }) {
    // This wrapper is needed because this is a server component by default,
    // but we need client-side hooks like useState and useEffect for interactivity.
    return <CourseContentPageClient />;
}
