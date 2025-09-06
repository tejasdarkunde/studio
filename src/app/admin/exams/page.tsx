
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Course, Exam, Question, ExamResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, Loader2, FileQuestion, Trash2, Link as LinkIcon, BarChart, Download, View, Search, Clock, Users } from 'lucide-react';
import { getCourses, addExam, updateExam, deleteExam, addQuestion, updateQuestion, deleteQuestion, getExamResults, deleteExamAttempt } from '@/app/actions';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/features/confirm-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const ManageExamDialog = ({
    isOpen,
    onClose,
    onSave,
    courses,
    initialData,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { courseId: string; title: string; duration?: number }) => Promise<void>;
    courses: Course[];
    initialData?: Exam & { courseId: string };
}) => {
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setTitle(initialData?.title || '');
            setDuration(initialData?.duration?.toString() || '');
            setSelectedCourseId(initialData?.courseId || '');
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!title.trim() || !selectedCourseId) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Course and Exam Title are required.'});
            return;
        }
        setIsSaving(true);
        await onSave({
            courseId: selectedCourseId,
            title,
            duration: duration ? parseInt(duration, 10) : undefined,
        });
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Exam' : 'Add New Exam'}</DialogTitle>
                     <DialogDescription>
                        {initialData ? `Update details for ${initialData.title}.` : 'Create a new exam and assign it to a course.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div>
                        <Label htmlFor="course-select">Course *</Label>
                        <Select onValueChange={setSelectedCourseId} value={selectedCourseId} disabled={!!initialData}>
                            <SelectTrigger id="course-select">
                                <SelectValue placeholder="Select a course" />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map((course) => (
                                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="exam-title">Exam Title *</Label>
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
    const [examDialog, setExamDialog] = useState<{isOpen: boolean; exam?: Exam & { courseId: string } }>({isOpen: false});
    const [viewingResultsFor, setViewingResultsFor] = useState<Exam | null>(null);
    const [resultCounts, setResultCounts] = useState<Record<string, number>>({});

    const { toast } = useToast();

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        const fetchedCourses = await getCourses();
        setCourses(fetchedCourses);

        const allExams = fetchedCourses.flatMap(c => (c.exams || []));
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
    
    const allExams = useMemo(() => {
        return courses.flatMap(course => 
            (course.exams || []).map(exam => ({
                ...exam,
                courseId: course.id,
                courseName: course.name,
            }))
        ).sort((a, b) => a.title.localeCompare(b.title));
    }, [courses]);

     const handleSaveExam = async (data: { courseId: string; title: string; duration?: number }) => {
        const isEditing = !!examDialog.exam;
        
        const action = isEditing ? updateExam : addExam;
        const payload = isEditing
            ? { ...data, examId: examDialog.exam!.id }
            : data;
        
        const result = await action(payload as any);
        if (result.success) {
            toast({ title: `Exam ${isEditing ? 'Updated' : 'Added'}` });
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
                courses={courses}
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
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Exam Management</CardTitle>
                            <CardDescription>Create, manage, and view results for all exams across all courses.</CardDescription>
                        </div>
                         <Button onClick={() => setExamDialog({isOpen: true})}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Exam
                        </Button>
                    </CardHeader>
                    <CardContent>
                       <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Exam Title</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead>Questions</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Submissions</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allExams.length > 0 ? allExams.map(exam => (
                                        <TableRow key={exam.id}>
                                            <TableCell className="font-medium">{exam.title}</TableCell>
                                            <TableCell><Badge variant="secondary">{exam.courseName}</Badge></TableCell>
                                            <TableCell>{exam.questions.length}</TableCell>
                                            <TableCell>{exam.duration ? `${exam.duration} min` : 'N/A'}</TableCell>
                                            <TableCell>{resultCounts[exam.id] || 0}</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleCopyLink(exam.id)} title="Copy direct link">
                                                    <LinkIcon className="h-4 w-4"/>
                                                </Button>
                                                <Button asChild variant="ghost" size="icon" title="Manage questions">
                                                    <Link href={`/admin/exams/${exam.courseId}/${exam.id}`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => setViewingResultsFor(exam)} title="View results">
                                                    <BarChart className="h-4 w-4" />
                                                </Button>
                                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletingExam({ exam, courseId: exam.courseId })} title="Delete exam">
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">No exams created yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                       </div>
                    </CardContent>
                </Card>
            </main>
        </>
    );
}
