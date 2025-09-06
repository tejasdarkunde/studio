

import { getCourses, getParticipantByIitpNo } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, User, Building, Lock, Clock, FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type StudentCoursesPageProps = {
    params: {
        iitpNo: string;
    }
};

export default async function StudentCoursesPage({ params }: StudentCoursesPageProps) {
    const { iitpNo } = params;
    const [allCourses, participant] = await Promise.all([
        getCourses(),
        getParticipantByIitpNo(iitpNo),
    ]);

    if (!participant) {
        notFound();
    }
    
    // 1. Get all courses the student is enrolled in
    const enrolledCourses = allCourses.filter(course =>
      participant.enrolledCourses?.some(enrolledCourseName =>
        course.name.toLowerCase() === enrolledCourseName.toLowerCase()
      )
    );

    // 2. Filter out courses where access is denied
    const deniedCourseIds = new Set(participant.deniedCourses || []);
    const accessibleCourses = enrolledCourses.filter(course => !deniedCourseIds.has(course.id) && course.status === 'active');
    const comingSoonCourses = enrolledCourses.filter(course => !deniedCourseIds.has(course.id) && course.status === 'coming-soon');
    const deniedCourses = enrolledCourses.filter(course => deniedCourseIds.has(course.id));

    const calculateCourseProgress = (courseId: string) => {
        const course = allCourses.find(c => c.id === courseId);
        if (!course) return { totalLessons: 0, completedLessons: 0, percentage: 0 };
        
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
    };


    return (
        <main className="container mx-auto p-4 md:p-8">
            <Card className="mb-12 bg-secondary/50">
                <CardHeader>
                    <CardTitle className="text-2xl">Welcome back, {participant.name}!</CardTitle>
                    <CardDescription>We're glad to see you.</CardDescription>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">IITP No.</p>
                            <p className="text-muted-foreground">{participant.iitpNo}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="font-semibold">Organization</p>
                            <p className="text-muted-foreground">{participant.organization || 'Not Specified'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mb-12">
                <h1 className="text-4xl font-bold tracking-tight text-primary">My Courses</h1>
                <p className="text-muted-foreground mt-2 text-lg">Here are the courses you are currently enrolled in.</p>
            </div>

            {accessibleCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {accessibleCourses.sort((a,b) => a.name.localeCompare(b.name)).map((course) => {
                        const progress = calculateCourseProgress(course.id);
                        return (
                        <Card key={course.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{course.name}</CardTitle>
                                <CardDescription>Contains {course.subjects.length} subjects.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div>
                                    <p className="font-semibold mb-2">Subjects include:</p>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                        {course.subjects.slice(0, 5).map(subject => (
                                            <li key={subject.id}>{subject.name}</li>
                                        ))}
                                        {course.subjects.length > 5 && <li>...and more.</li>}
                                    </ul>
                                </div>
                                {progress.totalLessons > 0 && (
                                    <div>
                                        <div className="flex justify-between items-center mb-2 text-sm">
                                            <p className="font-medium">Your Progress</p>
                                            <p className="text-muted-foreground">{progress.completedLessons} of {progress.totalLessons} lessons</p>
                                        </div>
                                        <Progress value={progress.percentage} />
                                        <p className="text-right text-sm font-bold text-primary mt-1">{progress.percentage}% Complete</p>
                                    </div>
                                )}
                                {course.exams && course.exams.length > 0 && (
                                    <div className="pt-4">
                                        <h4 className="font-semibold mb-2 text-sm">Exams</h4>
                                        <div className="space-y-2">
                                        {course.exams.map(exam => {
                                            const attempt = participant.examProgress?.[exam.id];
                                            return(
                                                <div key={exam.id} className="flex justify-between items-center p-2 rounded-md bg-secondary/50">
                                                    <div className="flex items-center gap-2">
                                                        <FileQuestion className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">{exam.title}</span>
                                                    </div>
                                                    {attempt?.isSubmitted ? (
                                                        <Button asChild size="sm" variant="outline">
                                                            <Link href={`/student/results/${participant.iitpNo}/${exam.id}`}>View Result</Link>
                                                        </Button>
                                                    ) : (
                                                        <Badge variant="destructive">Pending</Badge>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button asChild className="w-full">
                                    <Link href={`/student/courses/${iitpNo}/${course.id}`}>
                                        {progress.percentage === 100 ? 'Review Course' : 'Continue Course'} <ArrowRight />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    )})}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-16 border rounded-lg">
                    <h3 className="text-xl font-semibold text-foreground">No Active Courses Found</h3>
                    <p className="mt-2">You are not currently enrolled in any active courses.</p>
                    <p>Check the "Coming Soon" section below or contact an administrator.</p>
                </div>
            )}
            
            {comingSoonCourses.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-2xl font-semibold text-primary">Coming Soon</h2>
                    <p className="text-muted-foreground mt-2">These courses will be available soon. Stay tuned!</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                         {comingSoonCourses.map(course => (
                              <Card key={course.id} className="border-dashed">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-muted-foreground"><Clock className="h-5 w-5" />{course.name}</CardTitle>
                                    <CardDescription>This course is not yet available. Content will be unlocked soon.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Contains {course.subjects.length} subjects planned, including: {course.subjects.slice(0,2).map(s => s.name).join(', ')}...</p>
                                </CardContent>
                            </Card>
                         ))}
                    </div>
                </div>
            )}


             {deniedCourses.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-2xl font-semibold text-destructive">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">Access to the following enrolled courses has been revoked by an administrator:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                         {deniedCourses.map(course => (
                              <Card key={course.id} className="border-destructive/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-destructive"><Lock className="h-5 w-5" />{course.name}</CardTitle>
                                    <CardDescription>Your access to this course content has been denied.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">Please contact an administrator if you have questions about your enrollment status.</p>
                                </CardContent>
                            </Card>
                         ))}
                    </div>
                </div>
            )}
        </main>
    );
}
