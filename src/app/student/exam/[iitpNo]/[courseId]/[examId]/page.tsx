
"use client";

import { useEffect, useState, useRef, useTransition, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { getCourseById, getParticipantByIitpNo, saveExamProgress, submitExam } from '@/app/actions';
import type { Course, Exam, Participant, Question, QuestionType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Loader2, Send, ShieldAlert, Timer } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const QuestionRenderer = ({ question, answer, onAnswerChange }: { question: Question; answer: any; onAnswerChange: (questionId: string, answer: any) => void; }) => {
    const type = question.type || 'mcq';

    switch(type) {
        case 'mcq':
            return (
                <RadioGroup 
                    onValueChange={(value) => onAnswerChange(question.id, parseInt(value))}
                    value={answer?.toString()}
                >
                    {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center space-x-3 p-3 rounded-lg border has-[:checked]:bg-secondary has-[:checked]:border-primary transition-colors">
                            <RadioGroupItem value={oIndex.toString()} id={`q${question.id}-o${oIndex}`} />
                            <Label htmlFor={`q${question.id}-o${oIndex}`} className="font-normal text-base cursor-pointer flex-grow">{option}</Label>
                        </div>
                    ))}
                </RadioGroup>
            );
        case 'checkbox':
            const currentAnswers = Array.isArray(answer) ? answer : [];
            return (
                 <div>
                    {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center space-x-3 p-3 rounded-lg border has-[:checked]:bg-secondary has-[:checked]:border-primary transition-colors mb-2">
                           <Checkbox
                                id={`q${question.id}-o${oIndex}`}
                                checked={currentAnswers.includes(oIndex)}
                                onCheckedChange={(checked) => {
                                    const newAnswers = checked
                                        ? [...currentAnswers, oIndex]
                                        : currentAnswers.filter(i => i !== oIndex);
                                    onAnswerChange(question.id, newAnswers.sort());
                                }}
                            />
                            <Label htmlFor={`q${question.id}-o${oIndex}`} className="font-normal text-base cursor-pointer flex-grow">{option}</Label>
                        </div>
                    ))}
                </div>
            );
        case 'short-answer':
            return <Input value={answer || ''} onChange={(e) => onAnswerChange(question.id, e.target.value)} placeholder="Type your answer here..." />;
        case 'paragraph':
            return <Textarea value={answer || ''} onChange={(e) => onAnswerChange(question.id, e.target.value)} placeholder="Type your answer here..." rows={5} />;
        default:
            return <p>Unsupported question type</p>;
    }
}


export default function ExamPage() {
    const params = useParams();
    const router = useRouter();
    const { iitpNo, courseId, examId } = params as { iitpNo: string; courseId: string; examId: string };
    
    const [exam, setExam] = useState<Exam | null>(null);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<{[questionId: string]: number | number[] | string}>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [isSaving, startSaving] = useTransition();
    const [isSubmitting, startSubmitting] = useTransition();
    const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const { toast } = useToast();

     const handleSubmit = useCallback(() => {
        startSubmitting(async () => {
            if (!participant) return;
            // For paragraph questions, we don't save the answer in the submission for now as they aren't graded
            const answersToSubmit = {...answers};
            exam?.questions.forEach(q => {
                if (q.type === 'paragraph') {
                    delete answersToSubmit[q.id];
                }
            });

            const result = await submitExam({
                participantId: participant.id,
                courseId: courseId,
                examId: examId,
                answers: answersToSubmit as any,
            });

            if(result.success) {
                toast({ title: "Exam Submitted Successfully!" });
                router.push(`/student/results/${iitpNo}/${examId}`);
            } else {
                toast({ variant: 'destructive', title: "Submission Failed", description: result.error });
            }
        });
        setIsConfirmingSubmit(false);
    }, [participant, courseId, examId, answers, iitpNo, router, toast, exam]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [courseData, participantData] = await Promise.all([
                getCourseById(courseId),
                getParticipantByIitpNo(iitpNo),
            ]);

            if (!courseData || !participantData) {
                notFound();
            }

            const foundExam = courseData.exams?.find(e => e.id === examId);
            if (!foundExam) {
                notFound();
            }
            
            const savedAttempt = participantData.examProgress?.[examId];
            if (savedAttempt?.isSubmitted) {
                // If already submitted, redirect to results
                router.replace(`/student/results/${iitpNo}/${examId}`);
                return;
            }

            setExam(foundExam);
            setParticipant(participantData);
            
            if (savedAttempt?.answers) {
                setAnswers(savedAttempt.answers);
            }

            // Start timer if not already started
            if (foundExam.duration && !savedAttempt?.startedAt) {
                await saveExamProgress({ participantId: participantData.id, examId, answers: savedAttempt?.answers || {}, startedAt: new Date().toISOString() });
                // Re-fetch to get the server timestamp
                const updatedParticipantData = await getParticipantByIitpNo(iitpNo);
                setParticipant(updatedParticipantData);
            }

            setLoading(false);
        };

        fetchData();
    }, [courseId, examId, iitpNo, router]);
    
     useEffect(() => {
        if (!exam?.duration || !participant?.examProgress?.[examId]?.startedAt) {
            return;
        }

        const startedAt = new Date(participant.examProgress[examId].startedAt!).getTime();
        const endTime = startedAt + exam.duration * 60 * 1000;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const remaining = endTime - now;
            
            if (remaining > 0) {
                setTimeLeft(remaining);
            } else {
                setTimeLeft(0);
                clearInterval(interval);
                toast({
                    title: "Time's Up!",
                    description: "Your exam has been submitted automatically.",
                });
                handleSubmit();
            }
        }, 1000);

        return () => clearInterval(interval);

    }, [exam, participant, examId, toast, handleSubmit]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                setIsLocked(true);
            }
        };

        const handleBlur = () => {
            setIsLocked(true);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    const handleAnswerChange = (questionId: string, answer: any) => {
        const newAnswers = { ...answers, [questionId]: answer };
        setAnswers(newAnswers);

        startSaving(async () => {
            if (participant) {
                await saveExamProgress({
                    participantId: participant.id,
                    examId: examId,
                    answers: newAnswers as any,
                });
            }
        });
    };
    
    const goToQuestion = (index: number) => {
        if (index >= 0 && index < (exam?.questions.length || 0)) {
            setCurrentQuestionIndex(index);
        }
    }
    
     const formatTime = (ms: number | null) => {
        if (ms === null) return "00:00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        )
    }

    if (!exam || !participant) {
        // This case should be handled by the loading state and redirection, but as a fallback.
        return notFound();
    }
    
    const answeredCount = Object.keys(answers).filter(k => {
        const answer = answers[k];
        if (Array.isArray(answer)) return answer.length > 0;
        return answer !== undefined && answer !== '';
    }).length;
    const totalQuestions = exam.questions.length;
    const currentQuestion = exam.questions[currentQuestionIndex];
    const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    return (
        <>
        <AlertDialog open={isConfirmingSubmit} onOpenChange={setIsConfirmingSubmit}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have answered {answeredCount} out of {totalQuestions} questions. You will not be able to change your answers after submission.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Yes, Submit'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <main className="container mx-auto p-4 md:p-8 relative">
            {isLocked && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center text-white text-center p-8">
                    <div className="flex flex-col items-center gap-4">
                        <ShieldAlert className="h-16 w-16 text-destructive" />
                        <h2 className="text-3xl font-bold">Exam Locked</h2>
                        <p className="max-w-md">You have navigated away from the exam window. To prevent cheating, the exam has been locked. Please contact your proctor or administrator to continue.</p>
                    </div>
                </div>
            )}
             <div className="mb-8">
                <Button asChild variant="outline">
                    <Link href={`/student/courses/${iitpNo}/${courseId}`}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Course Content
                    </Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                    <Card className="flex flex-col min-h-[60vh]">
                        <CardHeader>
                             <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-3xl">{exam.title}</CardTitle>
                                    <CardDescription>Question {currentQuestionIndex + 1} of {totalQuestions}</CardDescription>
                                </div>
                                {exam.duration && (
                                    <div className="flex items-center gap-2 text-lg font-semibold text-destructive p-2 border border-destructive rounded-md">
                                        <Timer className="h-5 w-5"/>
                                        <span>{formatTime(timeLeft)}</span>
                                    </div>
                                )}
                            </div>
                             <Progress value={progressPercentage} className="mt-2" />
                        </CardHeader>
                        <CardContent className="flex-grow">
                             {currentQuestion && (
                                <div key={currentQuestion.id} className="p-2 md:p-6">
                                   <p className="font-semibold text-lg mb-6">{currentQuestion.text}</p>
                                   <QuestionRenderer
                                        question={currentQuestion}
                                        answer={answers[currentQuestion.id]}
                                        onAnswerChange={handleAnswerChange}
                                   />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="border-t pt-6 flex justify-between">
                             <Button variant="outline" onClick={() => goToQuestion(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}>
                                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                            </Button>
                            {isLastQuestion ? (
                                <Button onClick={() => setIsConfirmingSubmit(true)}>
                                    <Send className="mr-2 h-4 w-4" /> Submit Exam
                                </Button>
                            ) : (
                                <Button onClick={() => goToQuestion(currentQuestionIndex + 1)} disabled={isLastQuestion}>
                                    Next <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
                
                <aside className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>Questions</CardTitle>
                            <CardDescription>
                                Answered: {answeredCount} of {totalQuestions}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-5 gap-2">
                                {exam.questions.map((question, index) => {
                                    const answer = answers[question.id];
                                    const isAnswered = Array.isArray(answer)
                                        ? answer.length > 0
                                        : answer !== undefined && answer !== '';
                                    return (
                                        <Button
                                            key={question.id}
                                            variant={isAnswered ? 'default' : 'outline'}
                                            size="icon"
                                            onClick={() => goToQuestion(index)}
                                            className={cn(
                                                "h-10 w-10",
                                                isAnswered && "bg-green-600 hover:bg-green-700",
                                                index === currentQuestionIndex && "ring-2 ring-primary ring-offset-2"
                                            )}
                                        >
                                            {index + 1}
                                        </Button>
                                    )
                                })}
                            </div>
                        </CardContent>
                        <CardFooter>
                             <Button onClick={() => setIsConfirmingSubmit(true)} className="w-full">
                                <Send className="mr-2 h-4 w-4" /> Submit
                            </Button>
                        </CardFooter>
                    </Card>
                </aside>
            </div>
        </main>
        </>
    );
}

    

    
