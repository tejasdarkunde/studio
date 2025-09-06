
"use client";

import { useEffect, useState, useRef } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getCourseById, getParticipantByIitpNo } from '@/app/actions';
import type { Course, Exam, Participant, Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export default function ExamPage() {
    const params = useParams();
    const { iitpNo, courseId, examId } = params as { iitpNo: string; courseId: string; examId: string };
    
    const [exam, setExam] = useState<Exam | null>(null);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<{[questionId: string]: number}>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const { toast } = useToast();

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
            
            setExam(foundExam);
            setParticipant(participantData);
            setLoading(false);
        };

        fetchData();
    }, [courseId, examId, iitpNo]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                toast({
                    variant: "destructive",
                    title: "Warning: Focus Lost",
                    description: "You have switched tabs or minimized the window. This action may be flagged.",
                    duration: 5000,
                });
            }
        };

        const handleBlur = () => {
             toast({
                variant: "destructive",
                title: "Warning: Focus Lost",
                description: "You have switched to another window. This action may be flagged.",
                duration: 5000,
            });
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [toast]);

    const handleAnswerChange = (questionId: string, optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };
    
    const handleSubmit = () => {
        // TODO: Implement submission logic
        console.log("Submitting answers:", answers);
        alert("Submission functionality is not yet implemented.");
    };
    
    const goToQuestion = (index: number) => {
        if (index >= 0 && index < (exam?.questions.length || 0)) {
            setCurrentQuestionIndex(index);
        }
    }

    if (loading) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        )
    }

    if (!exam || !participant) {
        return notFound();
    }
    
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = exam.questions.length;
    const currentQuestion = exam.questions[currentQuestionIndex];
    const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    return (
        <main className="container mx-auto p-4 md:p-8">
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
                            <CardTitle className="text-3xl">{exam.title}</CardTitle>
                            <CardDescription>Question {currentQuestionIndex + 1} of {totalQuestions}</CardDescription>
                             <Progress value={progressPercentage} className="mt-2" />
                        </CardHeader>
                        <CardContent className="flex-grow">
                             {currentQuestion && (
                                <div key={currentQuestion.id} className="p-2 md:p-6">
                                   <p className="font-semibold text-lg mb-6">{currentQuestion.text}</p>
                                    <RadioGroup 
                                        onValueChange={(value) => handleAnswerChange(currentQuestion.id, parseInt(value))}
                                        value={answers[currentQuestion.id]?.toString()}
                                    >
                                        {currentQuestion.options.map((option, oIndex) => (
                                            <div key={oIndex} className="flex items-center space-x-3 p-3 rounded-lg border has-[:checked]:bg-secondary has-[:checked]:border-primary transition-colors">
                                                <RadioGroupItem value={oIndex.toString()} id={`q${currentQuestionIndex}-o${oIndex}`} />
                                                <Label htmlFor={`q${currentQuestionIndex}-o${oIndex}`} className="font-normal text-base cursor-pointer flex-grow">{option}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="border-t pt-6 flex justify-between">
                             <Button variant="outline" onClick={() => goToQuestion(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}>
                                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                            </Button>
                            {currentQuestionIndex === totalQuestions - 1 ? (
                                <Button onClick={handleSubmit}>
                                    <Send className="mr-2 h-4 w-4" /> Submit Exam
                                </Button>
                            ) : (
                                <Button onClick={() => goToQuestion(currentQuestionIndex + 1)} disabled={currentQuestionIndex === totalQuestions - 1}>
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
                                {exam.questions.map((question, index) => (
                                    <Button
                                        key={question.id}
                                        variant={answers[question.id] !== undefined ? 'default' : 'outline'}
                                        size="icon"
                                        onClick={() => goToQuestion(index)}
                                        className={cn(
                                            "h-10 w-10",
                                            answers[question.id] !== undefined && "bg-green-600 hover:bg-green-700",
                                            index === currentQuestionIndex && "ring-2 ring-primary ring-offset-2"
                                        )}
                                    >
                                        {index + 1}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </main>
    );
}
