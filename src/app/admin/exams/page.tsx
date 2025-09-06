
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Course, Exam, Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, Loader2, FileQuestion, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getCourses, addExam, updateExam, deleteExam, addQuestion, updateQuestion, deleteQuestion } from '@/app/actions';
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
                        <Label>Options *</Label>
                        <RadioGroup value={String(correctAnswer)} onValueChange={(val) => setCorrectAnswer(Number(val))} className="space-y-2 mt-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <RadioGroupItem value={String(index)} id={`option-${index}`} />
                                    <Input value={option} onChange={(e) => handleOptionChange(index, e.target.value)} placeholder={`Option ${index + 1}`} />
                                    <Button variant="ghost" size="icon" onClick={() => removeOption(index)} className="text-destructive h-8 w-8">
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


export default function ExamsPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingExam, setDeletingExam] = useState<{exam: Exam, courseId: string} | null>(null);
    const [questionDialog, setQuestionDialog] = useState<{isOpen: boolean; exam?: Exam; courseId?: string; question?: Question | null}>({isOpen: false});
    const [deletingQuestion, setDeletingQuestion] = useState<{question: Question; examId: string; courseId: string;} | null>(null);

    const { toast } = useToast();

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        const fetchedCourses = await getCourses();
        setCourses(fetchedCourses);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    const handleSaveQuestion = async (data: Omit<Question, 'id'>) => {
        if (!questionDialog.courseId || !questionDialog.exam) return;
        
        const action = questionDialog.question ? updateQuestion : addQuestion;
        
        const payload = questionDialog.question
            ? { ...data, questionId: questionDialog.question.id, examId: questionDialog.exam.id, courseId: questionDialog.courseId }
            : { ...data, examId: questionDialog.exam.id, courseId: questionDialog.courseId };

        const result = await action(payload as any);
        if(result.success) {
            toast({ title: `Question ${questionDialog.question ? 'Updated' : 'Added'}` });
            fetchCourses();
            setQuestionDialog({ isOpen: false });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    }
    
    const handleDeleteQuestion = async () => {
        if (!deletingQuestion) return;
        const result = await deleteQuestion(deletingQuestion);
        if (result.success) {
            toast({ title: "Question Deleted" });
            fetchCourses();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setDeletingQuestion(null);
    }
    
    const handleDeleteExam = async () => {
        if (!deletingExam) return;
        const result = await deleteExam(deletingExam);
        if (result.success) {
            toast({ title: "Exam Deleted" });
            fetchCourses();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setDeletingExam(null);
    }

    if (loading) {
        return (
             <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
             <ConfirmDialog 
                isOpen={!!deletingExam}
                onClose={() => setDeletingExam(null)}
                onConfirm={handleDeleteExam}
                title="Delete Exam?"
                description={`Permanently delete the exam "${deletingExam?.exam.title}". All questions inside will also be deleted.`}
            />
            <ConfirmDialog 
                isOpen={!!deletingQuestion}
                onClose={() => setDeletingQuestion(null)}
                onConfirm={handleDeleteQuestion}
                title="Delete Question?"
                description={`Permanently delete this question. This action cannot be undone.`}
            />
            <ManageQuestionDialog
                isOpen={questionDialog.isOpen}
                onClose={() => setQuestionDialog({ isOpen: false })}
                onSave={handleSaveQuestion}
                initialData={questionDialog.question}
            />

            <main className="mt-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Exam Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {courses.length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-4">
                                {courses.map(course => (
                                    <AccordionItem key={course.id} value={course.id} className="border rounded-lg">
                                        <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                                            {course.name}
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 pt-0 space-y-4">
                                            <div className="flex justify-end">
                                                <Button size="sm" onClick={async () => {
                                                    const title = prompt("Enter new exam title:");
                                                    if (title) {
                                                        const result = await addExam({ courseId: course.id, title });
                                                        if (result.success) {
                                                            toast({ title: "Exam Added" });
                                                            fetchCourses();
                                                        } else {
                                                            toast({ variant: 'destructive', title: 'Error', description: result.error });
                                                        }
                                                    }
                                                }}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Exam
                                                </Button>
                                            </div>
                                            <div className="space-y-4">
                                                {(course.exams || []).map(exam => (
                                                    <Card key={exam.id}>
                                                        <CardHeader>
                                                            <div className="flex justify-between items-center">
                                                                <CardTitle className="text-xl">{exam.title}</CardTitle>
                                                                <div className="flex gap-2">
                                                                    <Button variant="ghost" size="icon" onClick={async () => {
                                                                        const newTitle = prompt("Enter new exam title:", exam.title);
                                                                        if (newTitle) {
                                                                            const result = await updateExam({ courseId: course.id, examId: exam.id, title: newTitle });
                                                                                if (result.success) {
                                                                                toast({ title: "Exam Updated" });
                                                                                fetchCourses();
                                                                            } else {
                                                                                toast({ variant: 'destructive', title: 'Error', description: result.error });
                                                                            }
                                                                        }
                                                                    }}>
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="destructive" size="icon" onClick={() => setDeletingExam({ exam, courseId: course.id })}>
                                                                        <Trash className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="space-y-2">
                                                            <Button className="w-full" variant="outline" onClick={() => setQuestionDialog({ isOpen: true, exam, courseId: course.id })}>
                                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                                                            </Button>
                                                                {exam.questions.map((q, index) => (
                                                                <div key={q.id} className="p-3 rounded-md bg-secondary/50 flex items-center justify-between group">
                                                                    <div className="flex items-start gap-3">
                                                                        <span className="text-sm font-bold text-muted-foreground">{index + 1}.</span>
                                                                        <p className="text-sm font-medium">{q.text}</p>
                                                                    </div>
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQuestionDialog({ isOpen: true, exam, courseId: course.id, question: q })}><Pencil className="h-4 w-4" /></Button>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeletingQuestion({ question: q, examId: exam.id, courseId: course.id })}><Trash className="h-4 w-4" /></Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {exam.questions.length === 0 && <p className="text-center text-xs text-muted-foreground py-2">No questions in this exam yet.</p>}
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No courses found. Create a course first to add exams.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </>
    );
}
