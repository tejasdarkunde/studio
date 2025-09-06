
"use client";

import { getCourseById, getParticipantByIitpNo } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Course, Exam, Participant, Question } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Award, ChevronLeft, Check, X, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';


const QuestionReview = ({ question, selectedAnswer }: { question: Question; selectedAnswer: number | undefined }) => {
    const isCorrect = selectedAnswer === question.correctAnswer;
    const wasAttempted = selectedAnswer !== undefined;
    return (
        <div className="space-y-4 py-4">
            <h4 className="font-semibold text-lg">{question.text}</h4>
            <div className="space-y-2">
                {question.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrectAnswer = question.correctAnswer === index;
                    
                    return (
                        <div
                            key={index}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-md border",
                                isCorrectAnswer && 'bg-green-100 border-green-300 dark:bg-green-900/50 dark:border-green-700',
                                isSelected && !isCorrectAnswer && 'bg-red-100 border-red-300 dark:bg-red-900/50 dark:border-red-700'
                            )}
                        >
                            {isSelected ? (
                                isCorrect ? <Check className="h-5 w-5 text-green-600"/> : <X className="h-5 w-5 text-red-600"/>
                            ) : (
                                isCorrectAnswer ? <Check className="h-5 w-5 text-green-600" /> : <div className="h-5 w-5" />
                            )}
                            <p className={cn("flex-grow", isCorrectAnswer && 'font-bold')}>{option}</p>
                        </div>
                    )
                })}
            </div>
             {!wasAttempted && (
                <p className="text-sm text-center text-muted-foreground italic py-2">You did not answer this question.</p>
            )}
        </div>
    )
}

export default function ExamResultPage() {
    const params = useParams();
    const { iitpNo, examId } = params as { iitpNo: string; examId: string };

    const [exam, setExam] = useState<Exam | null>(null);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!iitpNo || !examId) return;
        const fetchResults = async () => {
            setLoading(true);
            const participantData = await getParticipantByIitpNo(iitpNo);
            if (!participantData?.examProgress?.[examId]?.isSubmitted) {
                notFound();
            }
            setParticipant(participantData);

            const allCourses = await getCourses();
            for (const course of allCourses) {
                const foundExam = course.exams?.find(e => e.id === examId);
                if (foundExam) {
                    setExam(foundExam);
                    break;
                }
            }
            setLoading(false);
        };
        fetchResults();
    }, [iitpNo, examId]);

    if (loading) {
        return <div>Loading...</div>
    }

    if (!participant || !exam) {
        notFound();
    }
    
    const attempt = participant.examProgress?.[examId];
    if (!attempt?.isSubmitted) {
        notFound();
    }
    
    const score = attempt.score ?? 0;
    const totalQuestions = exam.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

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
            
            <Card>
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Award className="h-16 w-16 text-yellow-500" />
                    </div>
                    <CardTitle className="text-4xl">Exam Result</CardTitle>
                    <CardDescription className="text-lg">Result for: {exam.title}</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                     <div className="flex items-baseline gap-4">
                        <p className="text-7xl font-bold text-primary">{score}</p>
                        <p className="text-3xl text-muted-foreground">/ {totalQuestions}</p>
                        <Badge className="text-xl" variant={percentage > 50 ? 'default' : 'destructive'}>{percentage}%</Badge>
                     </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <p className="text-muted-foreground">Submitted on: {new Date(attempt.submittedAt!).toLocaleString()}</p>
                </CardFooter>
            </Card>

            <div className="mt-12">
                <h2 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck /> Answer Review</h2>
                <Separator className="my-4" />
                <div className="space-y-6 divide-y">
                    {exam.questions.map((q, index) => (
                        <QuestionReview
                            key={q.id}
                            question={q}
                            selectedAnswer={attempt.answers[q.id]}
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}

// Dummy getCourses from a previous step, assuming it exists
async function getCourses() {
    const coursesSnapshot = await getDocs(collection(db, 'courses'));
    const courses: any[] = [];
     for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        courses.push({
            id: courseDoc.id,
            ...courseData,
        });
    }
    return courses;
}

      