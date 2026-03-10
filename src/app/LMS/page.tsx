"use client";

import { useEffect, useState } from 'react';
import { getCourses } from '@/app/actions';
import type { Course } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// A single course card component
const CourseCard = ({ course }: { course: { id: string; name: string; description: string; hint: string; } }) => {
  const imageUrl = `https://picsum.photos/seed/${course.id.replace(/-/g, '')}/600/400`;
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative h-48 w-full">
          <Image
              src={imageUrl}
              alt={course.name}
              fill
              className="object-cover"
              data-ai-hint={course.hint}
          />
      </div>
      <CardHeader>
        <CardTitle>{course.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{course.description}</p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
            <Link href={`/LMS/course/${course.id}`}>Start Learning</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};


export default function LMSPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
        setLoading(true);
        const allCourses = await getCourses();
        const activeCourses = allCourses.filter(course => course.status === 'active');
        setCourses(activeCourses);
        setLoading(false);
    }
    fetchCourses();
  }, []);


  return (
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold">Learning Management System</h1>
      <p className="mt-4 text-lg text-muted-foreground mb-8">
        Your enrolled courses will appear here. Select a course to begin learning.
      </p>
        {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <Skeleton className="h-48 w-full" />
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-4 w-full" />
                             <Skeleton className="h-4 w-full mt-2" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                    <CourseCard key={course.id} course={{
                        id: course.id,
                        name: course.name,
                        description: `Explore subjects like ${course.subjects.slice(0, 2).map(s => s.name).join(', ')} and more.`,
                        hint: course.name.split(' ').slice(0, 2).join(' ').toLowerCase()
                    }} />
                ))}
                {courses.length === 0 && (
                    <div className="border-2 border-dashed rounded-lg flex items-center justify-center p-8 text-center text-muted-foreground min-h-[350px] md:col-span-3">
                        <p>Courses coming soon...</p>
                    </div>
                )}
            </div>
        )}
    </main>
  );
}
