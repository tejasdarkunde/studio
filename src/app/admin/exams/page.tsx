

"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Course, Exam, Question, ExamResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, Loader2, FileQuestion, Trash2, Link as LinkIcon, BarChart } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getCourses, addExam, updateExam, deleteExam, addQuestion, updateQuestion, deleteQuestion, getExamResults } from '@/app/actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/features/confirm-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const ManageExamDialog = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    courseName,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string) => Promise<void>;
    initialData?: Exam | null;
    courseName: string;
}) => {
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTitle(initialData?.title || '');
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!title.trim()) return;
        setIsSaving(true);
        await onSave(title);
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? `Edit Exam in ${courseName}` : `Add New Exam to ${courseName}`}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="exam-title">Exam Title</Label>
                    <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} />
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

const ViewResultsDialog = ({
    isOpen,
    onClose,
    exam,
}: {
    isOpen: boolean;
    onClose: () => void;
    exam: Exam | null;
}) => {
    const [results, setResults] = useState<ExamResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && exam) {
            const fetchResults = async () => {
                setLoading(true);
                const fetchedResults = await getExamResults(exam.id);
                setResults(fetchedResults);
                setLoading(false);
            };
            fetchResults();
        }
    }, [isOpen, exam]);
    
    const handleDownloadResults = () => {
        // Simple CSV export
        const headers = "Rank,Name,IITP No,Score\n";
        const csvRows = results.map((res, index) => 
            `${index + 1},"${res.participantName}","${res.iitpNo}",${res.score}/${res.totalQuestions}`
        ).join('\n');
        const csv = headers + csvRows;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exam?.title}_results.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
         <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Results for: {exam?.title}</DialogTitle>
                </DialogHeader>
                 <DialogContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : results.length > 0 ? (
                        <ScrollArea className="h-96">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>IITP No</TableHead>
                                        <TableHead>Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((res, index) => (
                                        <TableRow key={res.participantId}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{res.participantName}</TableCell>
                                            <TableCell>{res.iitpNo}</TableCell>
                                            <TableCell>{res.score} / {res.totalQuestions}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    ) : (
                        <p className="text-center text-muted-foreground py-16">No results submitted for this exam yet.</p>
                    )}
                </DialogContent>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handleDownloadResults} disabled={results.length === 0 || loading}>Download CSV</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function ExamsPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingExam, setDeletingExam] = useState<{exam: Exam, courseId: string} | null>(null);
    const [examDialog, setExamDialog] = useState<{isOpen: boolean; course?: Course; exam?: Exam | null}>({isOpen: false});
    const [questionDialog, setQuestionDialog] = useState<{isOpen: boolean; exam?: Exam; courseId?: string; question?: Question | null}>({isOpen: false});
    const [deletingQuestion, setDeletingQuestion] = useState<{question: Question; examId: string; courseId: string;} | null>(null);
    const [viewingResultsFor, setViewingResultsFor] = useState<Exam | null>(null);

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

     const handleSaveExam = async (title: string) => {
        if (!examDialog.course) return;

        const action = examDialog.exam ? updateExam : addExam;
        const payload = examDialog.exam
            ? { courseId: examDialog.course.id, examId: examDialog.exam.id, title }
            : { courseId: examDialog.course.id, title };
        
        const result = await action(payload as any);
        if (result.success) {
            toast({ title: `Exam ${examDialog.exam ? 'Updated' : 'Added'}` });
            fetchCourses();
            setExamDialog({ isOpen: false });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };


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
        const result = await deleteExam({courseId: deletingExam.courseId, examId: deletingExam.exam.id});
        if (result.success) {
            toast({ title: "Exam Deleted" });
            fetchCourses();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setDeletingExam(null);
    }

    const handleCopyLink = (examId: string) => {
        const url = `${window.location.origin}/exam/${examId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: "The exam link has been copied to your clipboard."});
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
            <ManageExamDialog
                isOpen={examDialog.isOpen}
                onClose={() => setExamDialog({isOpen: false})}
                onSave={handleSaveExam}
                initialData={examDialog.exam}
                courseName={examDialog.course?.name || ''}
            />
            <ViewResultsDialog 
                isOpen={!!viewingResultsFor}
                onClose={() => setViewingResultsFor(null)}
                exam={viewingResultsFor}
            />
             <ConfirmDialog 
                isOpen={!!deletingExam}
                onClose={() => setDeletingExam(null)}
                onConfirm={handleDeleteExam}
                title="Delete Exam?"
                description={`Permanently delete the exam "${deletingExam?.exam.title}". All questions and results will also be deleted.`}
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
                        <CardDescription>Create and manage exams and their questions for each course.</CardDescription>
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
                                                <Button size="sm" onClick={() => setExamDialog({isOpen: true, course: course})}>
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
                                                                    <Button variant="ghost" size="icon" onClick={() => handleCopyLink(exam.id)} title="Copy direct link">
                                                                        <LinkIcon className="h-4 w-4"/>
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => setExamDialog({isOpen: true, course: course, exam: exam})} title="Edit exam">
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="destructive" size="icon" onClick={() => setDeletingExam({ exam, courseId: course.id })} title="Delete exam">
                                                                        <Trash className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="space-y-2">
                                                            <div className="flex gap-2">
                                                                <Button className="w-full" variant="outline" onClick={() => setQuestionDialog({ isOpen: true, exam, courseId: course.id })}>
                                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                                                                </Button>
                                                                <Button className="w-full" onClick={() => setViewingResultsFor(exam)}>
                                                                    <BarChart className="mr-2 h-4 w-4" /> View Results
                                                                </Button>
                                                            </div>
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
                                                 {course.exams?.length === 0 && (
                                                    <p className="text-center text-sm text-muted-foreground py-8">
                                                        No exams created for this course yet.
                                                    </p>
                                                )}
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

