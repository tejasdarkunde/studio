
"use client";

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getCourseById, getParticipantByIitpNo } from '@/app/actions';
import type { Course, Exam, Participant, Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Loader2, Send } from 'lucide-react';
import Link from 'next/link';

export default function ExamPage() {
    const params = useParams();
    const { iitpNo, courseId, examId } = params as { iitpNo: string; courseId: string; examId: string };
    
    const [exam, setExam] = useState<Exam | null>(null);
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<{[questionId: string]: number}>({});

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

    const handleAnswerChange = (questionId: string, optionIndex: number) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const handleSubmit = () => {
        // TODO: Implement submission logic
        console.log("Submitting answers:", answers);
        alert("Submission functionality is not yet implemented.");
    };

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
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{exam.title}</CardTitle>
                    <CardDescription>Please answer all questions to the best of your ability.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {exam.questions.map((question, qIndex) => (
                        <div key={question.id} className="p-6 border rounded-lg">
                           <p className="font-semibold mb-4">{qIndex + 1}. {question.text}</p>
                            <RadioGroup 
                                onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
                                value={answers[question.id]?.toString()}
                            >
                                {question.options.map((option, oIndex) => (
                                    <div key={oIndex} className="flex items-center space-x-2">
                                        <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                                        <Label htmlFor={`q${qIndex}-o${oIndex}`} className="font-normal">{option}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    ))}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmit} className="w-full md:w-auto ml-auto">
                        <Send className="mr-2 h-4 w-4" /> Submit Exam
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
