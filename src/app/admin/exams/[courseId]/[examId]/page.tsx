
"use client";

import { useState, useEffect, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Course, Exam, Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, Loader2, FileQuestion, Trash2, Clock, ChevronLeft } from 'lucide-react';
import { getCourseById, updateExam, addQuestion, updateQuestion, deleteQuestion } from '@/app/actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/features/confirm-dialog';

const ManageQuestionDialog = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Question, 'id'>) => Promise<void>;
    initialData?: Question | null;
}) => {
    const [text, setText] = useState('');
    const [options, setOptions] = useState<string[]>(['', '']);
    const [correctAnswer, setCorrectAnswer] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setText(initialData?.text || '');
            setOptions(initialData?.options || ['', '']);
            setCorrectAnswer(initialData?.correctAnswer || 0);
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => setOptions([...options, '']);
    const removeOption = (index: number) => {
        if (options.length <= 2) {
            toast({ variant: 'destructive', title: 'Cannot remove option', description: 'An MCQ must have at least two options.' });
            return;
        }
        setOptions(options.filter((_, i) => i !== index));
        if (correctAnswer === index) {
            setCorrectAnswer(0);
        } else if (correctAnswer > index) {
            setCorrectAnswer(prev => prev -1);
        }
    };

    const handleSave = async () => {
        if (!text.trim()) {
            toast({ variant: 'destructive', title: 'Question text is required.' });
            return;
        }
        if (options.some(opt => !opt.trim())) {
            toast({ variant: 'destructive', title: 'All options must be filled.' });
            return;
        }
        
        setIsSaving(true);
        await onSave({ text, options, correctAnswer });
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Question' : 'Add New Question'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                        <Label htmlFor="question-text">Question Text *</Label>
                        <Textarea id="question-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="What is the capital of France?" />
                    </div>
                    <div>
                        <Label>Options * (Select the correct answer)</Label>
                        <RadioGroup value={String(correctAnswer)} onValueChange={(val) => setCorrectAnswer(Number(val))} className="space-y-2 mt-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <RadioGroupItem value={String(index)} id={`option-${index}`} />
                                    <Input value={option} onChange={(e) => handleOptionChange(index, e.target.value)} placeholder={`Option ${index + 1}`} />
                                    <Button variant="ghost" size="icon" onClick={() => removeOption(index)} disabled={options.length <= 2} className="text-destructive h-8 w-8">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                    <Button variant="outline" size="sm" onClick={addOption}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Question'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const ManageExamDetailsDialog = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { title: string; duration?: number }) => Promise<void>;
    initialData?: Exam | null;
}) => {
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTitle(initialData?.title || '');
            setDuration(initialData?.duration?.toString() || '');
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!title.trim()) return;
        setIsSaving(true);
        await onSave({
            title,
            duration: duration ? parseInt(duration, 10) : undefined,
        });
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Exam Details</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="exam-title">Exam Title</Label>
                        <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="exam-duration">Duration (minutes)</Label>
                        <Input id="exam-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 60 (leave blank for no timer)" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function ManageExamPage() {
    const params = useParams();
    const router = useRouter();
    const { courseId, examId } = params as { courseId: string; examId: string };

    const [course, setCourse] = useState<Course | null>(null);
    const [exam, setExam] = useState<Exam | null>(null);
    const [loading, setLoading] = useState(true);

    const [questionDialog, setQuestionDialog] = useState<{isOpen: boolean; question?: Question | null}>({isOpen: false});
    const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    
    const { toast } = useToast();

    const fetchExamData = useCallback(async () => {
        const fetchedCourse = await getCourseById(courseId);
        if (!fetchedCourse) {
            notFound();
            return;
        }
        const fetchedExam = fetchedCourse.exams?.find(e => e.id === examId);
        if (!fetchedExam) {
            notFound();
            return;
        }
        setCourse(fetchedCourse);
        setExam(fetchedExam);
        setLoading(false);
    }, [courseId, examId]);

    useEffect(() => {
        fetchExamData();
    }, [fetchExamData]);
    
    const handleSaveExamDetails = async (data: { title: string; duration?: number }) => {
        if (!exam) return;
        
        const result = await updateExam({ ...data, courseId, examId });
        if (result.success) {
            toast({ title: 'Exam Details Updated' });
            fetchExamData();
            setIsEditingDetails(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };

    const handleSaveQuestion = async (data: Omit<Question, 'id'>) => {
        const action = questionDialog.question ? updateQuestion : addQuestion;
        
        const payload = questionDialog.question
            ? { ...data, questionId: questionDialog.question.id, examId, courseId }
            : { ...data, examId, courseId };

        const result = await action(payload as any);
        if(result.success) {
            toast({ title: `Question ${questionDialog.question ? 'Updated' : 'Added'}` });
            fetchExamData();
            setQuestionDialog({ isOpen: false });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    }
    
    const handleDeleteQuestion = async () => {
        if (!deletingQuestion) return;
        const result = await deleteQuestion({ questionId: deletingQuestion.id, examId, courseId });
        if (result.success) {
            toast({ title: "Question Deleted" });
            fetchExamData();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setDeletingQuestion(null);
    }
    
    if (loading || !exam || !course) {
        return (
             <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
             <ManageQuestionDialog
                isOpen={questionDialog.isOpen}
                onClose={() => setQuestionDialog({ isOpen: false })}
                onSave={handleSaveQuestion}
                initialData={questionDialog.question}
            />
             <ManageExamDetailsDialog
                isOpen={isEditingDetails}
                onClose={() => setIsEditingDetails(false)}
                onSave={handleSaveExamDetails}
                initialData={exam}
            />
             <ConfirmDialog 
                isOpen={!!deletingQuestion}
                onClose={() => setDeletingQuestion(null)}
                onConfirm={handleDeleteQuestion}
                title="Delete Question?"
                description={`Permanently delete this question. This action cannot be undone.`}
            />

            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-6">
                    <Button asChild variant="outline">
                        <Link href="/admin/exams">
                            <ChevronLeft className="mr-2 h-4 w-4" /> Back to All Exams
                        </Link>
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-primary">{course.name}</p>
                                <CardTitle className="text-3xl">{exam.title}</CardTitle>
                                <CardDescription className="flex items-center gap-4 text-sm mt-2">
                                    <span className="flex items-center gap-1"><FileQuestion className="h-4 w-4" /> {exam.questions.length} Questions</span>
                                    {exam.duration && (
                                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {exam.duration} minutes</span>
                                    )}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                 <Button variant="outline" onClick={() => setIsEditingDetails(true)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                </Button>
                                <Button onClick={() => setQuestionDialog({ isOpen: true })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg p-4 space-y-3">
                             {exam.questions.map((q, index) => (
                                <div key={q.id} className="p-3 rounded-md bg-secondary/50 flex items-center justify-between group">
                                    <div className="flex items-start gap-3">
                                        <span className="text-sm font-bold text-muted-foreground">{index + 1}.</span>
                                        <p className="text-sm font-medium">{q.text}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQuestionDialog({ isOpen: true, question: q })}><Pencil className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeletingQuestion(q)}><Trash className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                            {exam.questions.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No questions in this exam yet. Click "Add Question" to start building it.</p>}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </>
    )
}
