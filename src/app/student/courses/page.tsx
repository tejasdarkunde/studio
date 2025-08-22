
import { getCourses } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function StudentCoursesPage() {
    const courses = await getCourses();

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="mb-12">
                <h1 className="text-4xl font-bold tracking-tight text-primary">My Courses</h1>
                <p className="text-muted-foreground mt-2 text-lg">Welcome back! Here are the courses you have access to.</p>
            </div>

            {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {courses.sort((a,b) => a.name.localeCompare(b.name)).map((course) => (
                        <Card key={course.id}>
                            <CardHeader>
                                <CardTitle>{course.name}</CardTitle>
                                <CardDescription>Contains {course.subjects.length} subjects.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="font-semibold mb-2">Subjects include:</p>
                                <ul className="list-disc list-inside text-muted-foreground">
                                    {course.subjects.slice(0, 5).map(subject => (
                                        <li key={subject.id}>{subject.name}</li>
                                    ))}
                                     {course.subjects.length > 5 && <li>...and more.</li>}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button asChild className="w-full">
                                    <Link href={`/student/courses/${course.id}`}>
                                        View Course Content <ArrowRight />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <p>No courses are available at the moment.</p>
                    <p>Please check back later or contact an administrator.</p>
                </div>
            )}
        </main>
    );
}
