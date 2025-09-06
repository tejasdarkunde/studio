
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Course, Exam, Question, ExamResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, Loader2, FileQuestion, Trash2, Link as LinkIcon, BarChart, Download, View, Search, Clock, Users } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getCourses, addExam, updateExam, deleteExam, addQuestion, updateQuestion, deleteQuestion, getExamResults, deleteExamAttempt } from '@/app/actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/features/confirm-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

const ManageExamDialog = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    courseName,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { title: string; duration?: number }) => Promise<void>;
    initialData?: Exam | null;
    courseName: string;
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
                    <DialogTitle>{initialData ? `Edit Exam in ${courseName}` : `Add New Exam to ${courseName}`}</DialogTitle>
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

const ViewResultsDialog = ({
    isOpen,
    onClose,
    exam,
    onUpdateNeeded,
}: {
    isOpen: boolean;
    onClose: () => void;
    exam: Exam | null;
    onUpdateNeeded: () => void;
}) => {
    const [results, setResults] = useState<ExamResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingResult, setDeletingResult] = useState<ExamResult | null>(null);
    const { toast } = useToast();

    const fetchResults = useCallback(async () => {
        if (exam) {
            setLoading(true);
            const fetchedResults = await getExamResults(exam.id);
            setResults(fetchedResults);
            setLoading(false);
        }
    }, [exam]);

    useEffect(() => {
        if (isOpen && exam) {
            fetchResults();
        }
    }, [isOpen, exam, fetchResults]);
    
    const handleDownloadResults = () => {
        const headers = "Rank,Name,IITP No,Score\n";
        const csvRows = filteredResults.map((res, index) => 
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
    
    const handleDeleteResult = async () => {
        if (!deletingResult || !exam) return;

        const result = await deleteExamAttempt({ participantId: deletingResult.participantId, examId: exam.id });

        if (result.success) {
            toast({ title: "Result Deleted" });
            fetchResults(); // Refresh the results list
            onUpdateNeeded(); // Refresh main page data if needed
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setDeletingResult(null);
    }

    const filteredResults = results.filter(res => 
        res.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        res.iitpNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <ConfirmDialog
                isOpen={!!deletingResult}
                onClose={() => setDeletingResult(null)}
                onConfirm={handleDeleteResult}
                title="Delete Exam Result?"
                description={`This will permanently delete the exam submission for ${deletingResult?.participantName}. This action cannot be undone and will allow the student to retake the exam.`}
            />
             <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Results for: {exam?.title}</DialogTitle>
                    </DialogHeader>
                     <div className="py-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or IITP No..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        {loading ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : filteredResults.length > 0 ? (
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Rank</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>IITP No</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredResults.map((res, index) => (
                                            <TableRow key={res.participantId}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{res.participantName}</TableCell>
                                                <TableCell>{res.iitpNo}</TableCell>
                                                <TableCell>{res.score} / {res.totalQuestions}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="ghost" size="icon" title="View Submission">
                                                        <a href={`/student/results/${res.iitpNo}/${exam?.id}`} target="_blank">
                                                            <View className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingResult(res)} title="Delete Submission">
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        ) : (
                            <p className="text-center text-muted-foreground py-16">No results found for your search or no results submitted yet.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                        <Button onClick={handleDownloadResults} disabled={filteredResults.length === 0 || loading}>
                            <Download className="mr-2 h-4 w-4" /> Download CSV
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}


export default function ExamsPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingExam, setDeletingExam] = useState<{exam: Exam, courseId: string} | null>(null);
    const [examDialog, setExamDialog] = useState<{isOpen: boolean; course?: Course; exam?: Exam | null}>({isOpen: false});
    const [viewingResultsFor, setViewingResultsFor] = useState<Exam | null>(null);
    const [resultCounts, setResultCounts] = useState<Record<string, number>>({});

    const { toast } = useToast();

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        const fetchedCourses = await getCourses();
        setCourses(fetchedCourses);

        // Fetch result counts for all exams
        const allExams = fetchedCourses.flatMap(c => c.exams || []);
        const counts: Record<string, number> = {};
        for (const exam of allExams) {
            const results = await getExamResults(exam.id);
            counts[exam.id] = results.length;
        }
        setResultCounts(counts);

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

     const handleSaveExam = async (data: { title: string; duration?: number }) => {
        if (!examDialog.course) return;

        const action = examDialog.exam ? updateExam : addExam;
        const payload = examDialog.exam
            ? { courseId: examDialog.course.id, examId: examDialog.exam.id, ...data }
            : { courseId: examDialog.course.id, ...data };
        
        const result = await action(payload as any);
        if (result.success) {
            toast({ title: `Exam ${examDialog.exam ? 'Updated' : 'Added'}` });
            fetchCourses();
            setExamDialog({ isOpen: false });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };
    
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
                onUpdateNeeded={fetchCourses}
            />
             <ConfirmDialog 
                isOpen={!!deletingExam}
                onClose={() => setDeletingExam(null)}
                onConfirm={handleDeleteExam}
                title="Delete Exam?"
                description={`Permanently delete the exam "${deletingExam?.exam.title}". All questions and results will also be deleted.`}
            />
            
            <main className="mt-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Exam Management</CardTitle>
                        <CardDescription>Create and manage exams for each course. Click "Manage" to add questions and adjust settings.</CardDescription>
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
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <CardTitle className="text-xl">{exam.title}</CardTitle>
                                                                    <CardDescription className="flex items-center gap-4 text-sm mt-1">
                                                                        <span className="flex items-center gap-1"><FileQuestion className="h-4 w-4" /> {exam.questions.length} Questions</span>
                                                                        {exam.duration && (
                                                                            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {exam.duration} minutes</span>
                                                                        )}
                                                                        <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {resultCounts[exam.id] || 0} Submissions</span>
                                                                    </CardDescription>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button variant="ghost" size="icon" onClick={() => handleCopyLink(exam.id)} title="Copy direct link">
                                                                        <LinkIcon className="h-4 w-4"/>
                                                                    </Button>
                                                                     <Button variant="destructive" size="icon" onClick={() => setDeletingExam({ exam, courseId: course.id })} title="Delete exam">
                                                                        <Trash className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardHeader>
                                                        <CardFooter className="flex gap-2">
                                                            <Button asChild className="w-full" variant="outline">
                                                                <Link href={`/admin/exams/${course.id}/${exam.id}`}>
                                                                    <Pencil className="mr-2 h-4 w-4" /> Manage
                                                                </Link>
                                                            </Button>
                                                            <Button className="w-full" onClick={() => setViewingResultsFor(exam)}>
                                                                <BarChart className="mr-2 h-4 w-4" /> View Results ({resultCounts[exam.id] || 0})
                                                            </Button>
                                                        </CardFooter>
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

    