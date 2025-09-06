
"use client";

import { useEffect, useState } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { getCourses, verifyExamAccess } from '@/app/actions';
import type { Course, Exam } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ExamLoginForm } from '@/components/features/exam-login-form';

export default function ExamDirectAccessPage() {
    const params = useParams();
    const router = useRouter();
    const { examId } = params as { examId: string };
    
    const [exam, setExam] = useState<Exam | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const findExam = async () => {
            setLoading(true);
            const allCourses = await getCourses();
            for (const course of allCourses) {
                const foundExam = course.exams?.find(e => e.id === examId);
                if (foundExam) {
                    setExam(foundExam);
                    setCourse(course);
                    break;
                }
            }
            setLoading(false);
        };
        findExam();
    }, [examId]);

    const handleLoginSuccess = (iitpNo: string, courseId: string) => {
        router.push(`/student/exam/${iitpNo}/${courseId}/${examId}`);
    };

    if (loading) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }
    
    if (!exam || !course) {
        notFound();
    }

    return (
        <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen">
             <div className="w-full max-w-md">
                <div className="flex flex-col items-center justify-center text-center mb-8">
                    <p className="text-xl font-bold text-primary tracking-tight">
                        {course.name}
                    </p>
                    <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">
                        {exam.title}
                    </h1>
                </div>
                 <Card>
                    <CardHeader>
                        <CardTitle>Welcome</CardTitle>
                        <CardDescription>Enter your IITP No. to begin the exam.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ExamLoginForm 
                            examId={examId}
                            onSuccess={handleLoginSuccess}
                        />
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
