
"use client";

import { getParticipantByIitpNo, getCourses } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Exam, Participant, Question, Course } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Award, ChevronLeft, Check, X, ClipboardCheck, Download, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Certificate } from '@/components/features/certificate';


const QuestionReview = ({ question, selectedAnswer, rationale }: { question: Question; selectedAnswer: any; rationale?: string }) => {
    const type = question.type || 'mcq';
    let isCorrect = false;
    let wasAttempted = false;

    if (type === 'mcq' || type === 'short-answer') {
        const correct = Array.isArray(question.correctAnswers) ? question.correctAnswers[0] : (question as any).correctAnswer;
        if (type === 'short-answer') {
            isCorrect = typeof selectedAnswer === 'string' && selectedAnswer.toLowerCase() === (correct as string)?.toLowerCase();
        } else {
            isCorrect = selectedAnswer === correct;
        }
        wasAttempted = selectedAnswer !== undefined;
    } else if (type === 'checkbox') {
        const correct = new Set(Array.isArray(question.correctAnswers) ? question.correctAnswers : [(question as any).correctAnswer]);
        const selected = new Set(Array.isArray(selectedAnswer) ? selectedAnswer : []);
        isCorrect = correct.size === selected.size && [...correct].every(val => selected.has(val));
        wasAttempted = Array.isArray(selectedAnswer) && selectedAnswer.length > 0;
    } else if (type === 'paragraph') {
        wasAttempted = !!selectedAnswer;
    }


    return (
        <div className="space-y-4 py-4">
            <h4 className="font-semibold text-lg">{question.text}</h4>
            <div className="space-y-2">
                {type === 'mcq' && question.options.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrectAnswer = question.correctAnswers.includes(index);
                    return (
                        <div key={index} className={cn("flex items-center gap-3 p-3 rounded-md border", isCorrectAnswer && 'bg-green-100 border-green-300 dark:bg-green-900/50 dark:border-green-700', isSelected && !isCorrectAnswer && 'bg-red-100 border-red-300 dark:bg-red-900/50 dark:border-red-700')}>
                            {isSelected ? (isCorrect ? <Check className="h-5 w-5 text-green-600"/> : <X className="h-5 w-5 text-red-600"/>) : (isCorrectAnswer ? <Check className="h-5 w-5 text-green-600" /> : <div className="h-5 w-5" />)}
                            <p className={cn("flex-grow", isCorrectAnswer && 'font-bold')}>{option}</p>
                        </div>
                    )
                })}
                 {type === 'checkbox' && question.options.map((option, index) => {
                    const isSelected = (selectedAnswer as number[])?.includes(index);
                    const isCorrectAnswer = question.correctAnswers.includes(index);
                    return (
                        <div key={index} className={cn("flex items-center gap-3 p-3 rounded-md border", isCorrectAnswer && 'bg-green-100 border-green-300 dark:bg-green-900/50 dark:border-green-700', isSelected && !isCorrectAnswer && 'bg-red-100 border-red-300 dark:bg-red-900/50 dark:border-red-700')}>
                            {isSelected ? (isCorrectAnswer ? <Check className="h-5 w-5 text-green-600"/> : <X className="h-5 w-5 text-red-600"/>) : (isCorrectAnswer ? <Check className="h-5 w-5 text-green-600" /> : <div className="h-5 w-5" />)}
                            <p className={cn("flex-grow", isCorrectAnswer && 'font-bold')}>{option}</p>
                        </div>
                    )
                })}
                {type === 'short-answer' && (
                     <div className={cn("flex items-center gap-3 p-3 rounded-md border", isCorrect ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300')}>
                        {isCorrect ? <Check className="h-5 w-5 text-green-600"/> : <X className="h-5 w-5 text-red-600"/>}
                        <p>Your answer: <span className="font-semibold">{selectedAnswer || '(Not answered)'}</span></p>
                    </div>
                )}
                 {type === 'paragraph' && (
                     <div className="p-4 rounded-md border bg-secondary">
                        <p className="text-sm text-muted-foreground mb-2">Your Answer (not graded):</p>
                        <p className="whitespace-pre-wrap">{selectedAnswer || '(Not answered)'}</p>
                    </div>
                )}
            </div>
             {!wasAttempted && type !== 'paragraph' && (
                <p className="text-sm text-center text-muted-foreground italic py-2">You did not answer this question.</p>
            )}
             {rationale && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mt-2 flex gap-2">
                    <Info className="h-5 w-5 text-yellow-500 mt-1 shrink-0" />
                    <div>
                        <h5 className="font-semibold text-yellow-800">Rationale</h5>
                        <p className="text-sm text-yellow-700">{rationale}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ExamResultPage() {
    const { iitpNo, examId } = useParams() as { iitpNo: string; examId: string };

    const [exam, setExam] = useState<Exam | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const certificateRef = useRef<HTMLDivElement>(null);

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
            for (const c of allCourses) {
                const foundExam = c.exams?.find(e => e.id === examId);
                if (foundExam) {
                    setExam(foundExam);
                    setCourse(c);
                    break;
                }
            }
            setLoading(false);
        };
        fetchResults();
    }, [iitpNo, examId]);
    
    const handleDownloadCertificate = useCallback(() => {
        if (!certificateRef.current) {
            return;
        }
        setIsDownloading(true);
        toPng(certificateRef.current, { cacheBust: true, pixelRatio: 1.5 })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `BSA_Certificate_${participant?.name.replace(/ /g, '_')}.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('Failed to generate certificate', err);
            })
            .finally(() => {
                setIsDownloading(false);
            });
    }, [participant?.name]);


    if (loading) {
        return <div>Loading...</div>
    }

    if (!participant || !exam || !course) {
        notFound();
    }
    
    const attempt = participant.examProgress?.[examId];
    if (!attempt?.isSubmitted) {
        notFound();
    }
    
    const score = attempt.score ?? 0;
    const gradableQuestions = exam.questions.filter(q => q.type !== 'paragraph');
    const totalQuestions = gradableQuestions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    const canGetCertificate = percentage >= 80;

    return (
        <main className="container mx-auto p-4 md:p-8">
             {/* Hidden certificate for rendering */}
             <div className="fixed -left-[9999px] top-0">
                <Certificate
                    ref={certificateRef}
                    studentName={participant.name}
                    courseName={course.name}
                    date={new Date(attempt.submittedAt!).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                />
            </div>

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
                <CardContent className="flex flex-col items-center gap-4">
                     <div className="flex items-baseline gap-4">
                        <p className="text-7xl font-bold text-primary">{score}</p>
                        <p className="text-3xl text-muted-foreground">/ {totalQuestions}</p>
                        <Badge className="text-xl" variant={percentage >= 50 ? 'default' : 'destructive'}>{percentage}%</Badge>
                     </div>
                      {canGetCertificate && (
                        <Button onClick={handleDownloadCertificate} disabled={isDownloading}>
                            {isDownloading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Generating...</> : <><Download className="mr-2 h-4 w-4" /> Download Certificate</>}
                        </Button>
                    )}
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <p className="text-muted-foreground">Submitted on: {new Date(attempt.submittedAt!).toLocaleString()}</p>
                </CardFooter>
            </Card>

            <div className="mt-12">
                <h2 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck /> Answer Review</h2>
                <Separator className="my-4" />
                <div className="space-y-6 divide-y">
                    {exam.questions.map((q) => (
                        <QuestionReview
                            key={q.id}
                            question={q}
                            selectedAnswer={attempt.answers[q.id]}
                            rationale={q.rationale}
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}
