
"use client";

import { getCourseById, getParticipantByIitpNo, markLessonAsComplete } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { Video, BookOpen, ChevronLeft, CheckCircle2, Clock, Download, FileText, PlayCircle, ChevronRight, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Course, Lesson, Participant, Subject } from '@/lib/types';
import { useEffect, useState, useTransition, useMemo, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoPlayer } from '@/components/features/video-player';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';


const CourseContentPageClient = () => {
    const { iitpNo, courseId } = useParams() as { iitpNo: string; courseId: string; };

    const [course, setCourse] = useState<Course | null>(null);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const contentRef = useRef<HTMLDivElement>(null);


    const fetchParticipantData = async () => {
        const participantData = await getParticipantByIitpNo(iitpNo);
         if (!participantData) {
            notFound();
        }
        setParticipant(participantData);
        return participantData;
    };

    useEffect(() => {
        if (!courseId || !iitpNo) return;
        
        const fetchData = async () => {
            setLoading(true);
            const [courseData, participantData] = await Promise.all([
                getCourseById(courseId),
                getParticipantByIitpNo(iitpNo),
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
    }, [courseId, iitpNo]);
    
    const allLessons = useMemo(() => {
        if (!course) return [];
        return course.subjects.flatMap(subject => 
            subject.units.flatMap(unit => 
                unit.lessons.map(lesson => ({...lesson, unitTitle: unit.title, subjectName: subject.name}))
            )
        );
    }, [course]);

    const lessonNavigation = useMemo(() => {
        if (!selectedLesson || allLessons.length === 0) return { prev: null, next: null };
        const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id);
        if (currentIndex === -1) return { prev: null, next: null };
        
        const prev = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
        const next = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

        return { prev, next };
    }, [selectedLesson, allLessons]);


    const progress = useMemo(() => {
        if (!course || !participant) return { totalLessons: 0, completedLessons: 0, percentage: 0 };
        
        const allLessonIds = new Set<string>();
        course.subjects.forEach(subject => {
            subject.units.forEach(unit => {
                unit.lessons.forEach(lesson => {
                    allLessonIds.add(lesson.id);
                });
            });
        });

        const totalLessons = allLessonIds.size;
        if (totalLessons === 0) return { totalLessons: 0, completedLessons: 0, percentage: 0 };
        
        const completedStudentLessons = new Set(participant.completedLessons || []);
        
        const completedInCourse = Array.from(allLessonIds).filter(lessonId => completedStudentLessons.has(lessonId)).length;

        return {
            totalLessons: totalLessons,
            completedLessons: completedInCourse,
            percentage: Math.round((completedInCourse / totalLessons) * 100),
        };
    }, [course, participant]);
    
    const subjectProgress = useMemo(() => {
        if (!course || !participant) return {};
        const completedLessonsSet = new Set(participant.completedLessons || []);
        
        const progressMap: {[subjectId: string]: number} = {};

        course.subjects.forEach(subject => {
            const subjectLessonIds = subject.units.flatMap(unit => unit.lessons.map(lesson => lesson.id));
            const totalLessons = subjectLessonIds.length;
            if (totalLessons === 0) {
                progressMap[subject.id] = 100; // No lessons means 100% complete
                return;
            }
            const completedCount = subjectLessonIds.filter(id => completedLessonsSet.has(id)).length;
            progressMap[subject.id] = Math.round((completedCount / totalLessons) * 100);
        });

        return progressMap;

    }, [course, participant]);

    const nextLesson = useMemo(() => {
        if (!course || !participant) return null;
        const completedLessonsSet = new Set(participant.completedLessons || []);
        
        for (const subject of course.subjects) {
            for (const unit of subject.units) {
                for (const lesson of unit.lessons) {
                    if (!completedLessonsSet.has(lesson.id)) {
                        return lesson;
                    }
                }
            }
        }
        return null; // All lessons completed
    }, [course, participant]);

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
                await fetchParticipantData();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error,
                });
            }
        });
    }

     const handleContinueClick = () => {
        if (progress.percentage === 100) {
            // Scroll to content if course is complete
            contentRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else if (nextLesson) {
            setSelectedLesson(nextLesson);
        }
    };
    
    const handleSubjectClick = (subjectId: string) => {
        const element = document.getElementById(`subject-${subjectId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                <DialogContent className="max-w-6xl w-full h-full md:h-auto md:max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-4 md:p-6 pb-2">
                        <DialogTitle className="text-lg md:text-2xl">{selectedLesson?.title}</DialogTitle>
                         {selectedLesson?.duration && (
                            <DialogDescription className="flex items-center gap-1"><Clock className="h-4 w-4" /> {selectedLesson.duration} min</DialogDescription>
                        )}
                    </DialogHeader>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 px-4 md:px-6 flex-grow min-h-0">
                        <div className="lg:col-span-2 h-full flex flex-col">
                        {selectedLesson?.videoUrl && (
                           <VideoPlayer url={selectedLesson.videoUrl} />
                        )}
                        </div>
                        <div className="flex flex-col gap-4 h-full lg:max-h-[60vh]">
                            <h3 className="text-base md:text-lg font-semibold">Lesson Details</h3>
                            <Separator />
                            <ScrollArea className="flex-grow pr-4 -mr-4">
                                {(selectedLesson?.description || selectedLesson?.documentUrl) ? (
                                    <div className="space-y-4">
                                        {selectedLesson.description && (
                                            <div>
                                                <h4 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4"/> Description</h4>
                                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{selectedLesson.description}</p>
                                            </div>
                                        )}
                                        {selectedLesson.documentUrl && (
                                            <div>
                                                <h4 className="font-semibold mb-2 flex items-center gap-2"><Download className="h-4 w-4"/> Attachments</h4>
                                                <Button asChild variant="secondary" size="sm">
                                                    <Link href={selectedLesson.documentUrl} target="_blank" download>
                                                        Download Document
                                                    </Link>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No description or attachments for this lesson.</p>
                                )}
                            </ScrollArea>
                             <div className="mt-auto pt-4">
                            {isLessonCompleted ? (
                                 <div className="flex items-center justify-center gap-2 text-green-600 font-semibold p-3 bg-green-50 rounded-md">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span>Lesson Completed</span>
                                </div>
                            ) : (
                                 <Button onClick={() => selectedLesson && handleMarkAsComplete(selectedLesson.id)} disabled={isPending} className="w-full">
                                    {isPending ? 'Saving...' : 'Mark as Complete'}
                                </Button>
                            )}
                            </div>
                        </div>
                    </div>
                     <DialogFooter className="bg-secondary/50 p-2 md:p-4 border-t flex justify-between items-center sm:justify-between mt-auto">
                         <Button variant="outline" size="sm" onClick={() => lessonNavigation.prev && setSelectedLesson(lessonNavigation.prev)} disabled={!lessonNavigation.prev}>
                            <ChevronLeft className="mr-1 h-4 w-4"/> Prev
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => lessonNavigation.next && setSelectedLesson(lessonNavigation.next)} disabled={!lessonNavigation.next}>
                            Next <ChevronRight className="ml-1 h-4 w-4"/>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-8">
                    <Button asChild variant="outline">
                        <Link href={`/student/courses/${iitpNo}`}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to My Courses
                        </Link>
                    </Button>
                </div>
                
                <div className="mb-8">
                    <p className="text-lg text-primary font-semibold">{course.name}</p>
                    <h1 className="text-4xl font-bold tracking-tight">Course Content</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Browse the subjects, units, and lessons for this course.</p>
                </div>

                <div className="space-y-6 mb-12">
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2 text-sm">
                                    <p className="font-medium">Your Progress</p>
                                    <p className="text-muted-foreground">{progress.completedLessons} of {progress.totalLessons} lessons</p>
                                </div>
                                <Progress value={progress.percentage} />
                                <p className="text-right text-sm font-bold text-primary mt-1">{progress.percentage}% Complete</p>
                            </div>
                             <Button className="w-full" onClick={handleContinueClick} disabled={!nextLesson && progress.percentage < 100}>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                {progress.percentage === 100
                                    ? 'Review Course'
                                    : `Continue Lesson: ${nextLesson?.title}`
                                }
                            </Button>
                            <Separator />
                            <div>
                                <p className="text-sm font-medium mb-2">Course Path</p>
                                <ScrollArea className="w-full whitespace-nowrap">
                                    <div className="flex gap-2 pb-2">
                                    {course.subjects.map((subject, index) => (
                                        <Button key={subject.id} variant="secondary" size="sm" onClick={() => handleSubjectClick(subject.id)}>
                                            {subject.name} ({subjectProgress[subject.id] || 0}%)
                                            {index < course.subjects.length - 1 && <ChevronRight className="h-4 w-4 ml-2 text-muted-foreground" />}
                                        </Button>
                                    ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {course.exams && course.exams.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold tracking-tight mb-4">Exams</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {course.exams.map(exam => (
                                <Card key={exam.id}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileQuestion className="h-5 w-5 text-primary" />
                                            {exam.title}
                                        </CardTitle>
                                        <CardDescription>{exam.questions.length} questions</CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button asChild className="w-full">
                                            <Link href={`/student/exam/${iitpNo}/${course.id}/${exam.id}`}>
                                                Start Exam <ChevronRight className="ml-2 h-4 w-4"/>
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}


                <div ref={contentRef}>
                    {course.subjects.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-4">
                            {course.subjects.map(subject => (
                                <AccordionItem value={subject.id} key={subject.id} id={`subject-${subject.id}`} className="border rounded-lg scroll-mt-20">
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
                </div>
            </main>
        </>
    );
}


export default function CourseContentPage() {
    // This wrapper is needed because this is a server component by default,
    // but we need client-side hooks like useState and useEffect for interactivity.
    return <CourseContentPageClient />;
}
