

import { getCourseById, getParticipantByIitpNo } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Video, BookOpen, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CourseContentPageProps = {
    params: {
        iitpNo: string;
        courseId: string;
    }
};

export default async function CourseContentPage({ params }: CourseContentPageProps) {
    const { iitpNo, courseId } = params;
    const [course, participant] = await Promise.all([
        getCourseById(courseId),
        getParticipantByIitpNo(iitpNo),
    ]);

    if (!participant || !course) {
        notFound();
    }
    
    // Check if the student is actually enrolled in this course
    const isEnrolled = participant.enrolledCourses?.some(enrolledCourseName => 
        course.name.toLowerCase() === enrolledCourseName.toLowerCase()
    );

    if (!isEnrolled) {
        // Or redirect to their main courses page with an error message
        notFound();
    }

    return (
        <main className="container mx-auto p-4 md:p-8">
             <div className="mb-8">
                <Button asChild variant="outline">
                    <Link href={`/student/courses/${iitpNo}`}>
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
                                                                 <Button size="sm" variant="ghost" asChild>
                                                                    <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">
                                                                        Watch Video
                                                                    </a>
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
    );
}
