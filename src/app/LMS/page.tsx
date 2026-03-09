"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

// A single course card component
const CourseCard = ({ course }: { course: { name: string; description: string; imageUrl: string; hint: string;} }) => {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative h-48 w-full">
          <Image
              src={course.imageUrl}
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
        <Button className="w-full">Start Learning</Button>
      </CardFooter>
    </Card>
  );
};


export default function LMSPage() {
  const sampleCourses = [
    {
      name: "Diploma in Electronics Assembly",
      description: "Learn the fundamentals of electronics assembly, including soldering, component identification, and safety procedures.",
      imageUrl: "https://picsum.photos/seed/lms1/600/400",
      hint: "electronics assembly",
    },
    {
      name: "Advance Diploma in Manufacturing",
      description: "A comprehensive course on modern manufacturing techniques, quality control, and process optimization.",
      imageUrl: "https://picsum.photos/seed/lms2/600/400",
      hint: "manufacturing robotics"
    },
  ];

  return (
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold">Learning Management System</h1>
      <p className="mt-4 text-lg text-muted-foreground mb-8">
        Your enrolled courses will appear here. Select a course to begin learning.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleCourses.map((course, index) => (
            <CourseCard key={index} course={course} />
        ))}
         <div className="border-2 border-dashed rounded-lg flex items-center justify-center p-8 text-center text-muted-foreground min-h-[350px]">
          <p>More courses coming soon...</p>
        </div>
      </div>
    </main>
  );
}
