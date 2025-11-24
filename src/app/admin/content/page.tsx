
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Course, Subject, Unit, Lesson } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, Loader2, Save, XCircle, ChevronRight, FolderPlus, FileVideo, Video, Clock, Ban, RotateCcw, BookCopy, ChevronLeft, Circle, CircleDot, CircleSlash, Book } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { addCourse, getCourses, updateCourseName, addSubject, updateSubject, deleteSubject, addUnit, updateUnit, deleteUnit, addLesson, updateLesson, deleteLesson, updateCourseStatus, deleteCourse } from '@/app/actions';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/features/confirm-dialog';

const ManageLessonDialog = ({
    isOpen,
    onClose,
    onSave,
    initialData,
} : {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Lesson, 'id'>) => Promise<void>;
    initialData?: Lesson;
}) => {
    const [title, setTitle] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [duration, setDuration] = useState('');
    const [description, setDescription] = useState('');
    const [documentUrl, setDocumentUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setTitle(initialData?.title || '');
            setVideoUrl(initialData?.videoUrl || '');
            setDuration(initialData?.duration?.toString() || '');
            setDescription(initialData?.description || '');
            setDocumentUrl(initialData?.documentUrl || '');
            setIsSaving(false);
        }
    }, [isOpen, initialData])

    const handleSave = async () => {
        setIsSaving(true);
        const durationNumber = duration ? parseInt(duration, 10) : undefined;
        await onSave({ title, videoUrl, duration: durationNumber, description, documentUrl });
        setIsSaving(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
                    <DialogDescription>Fill in the details for this lesson.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label htmlFor="lesson-title">Lesson Title *</Label>
                        <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lesson-url">Video URL * (YouTube, Vimeo, etc.)</Label>
                        <Input id="lesson-url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="lesson-duration">Duration (minutes)</Label>
                        <Input id="lesson-duration" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 45" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lesson-desc">Description</Label>
                        <Textarea id="lesson-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description, key points, or reference links..." />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lesson-doc-url">Document URL (Optional)</Label>
                        <Input id="lesson-doc-url" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="e.g., link to a Google Drive PPT" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Lesson'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const CourseContentManager = ({ course, onContentUpdated }: { course: Course; onContentUpdated: () => void; }) => {
    // Course states
    const [isEditingCourseName, setIsEditingCourseName] = useState(false);
    const [editingCourseNameValue, setEditingCourseNameValue] = useState(course.name);
    const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

    // Subject states
    const [newSubject, setNewSubject] = useState('');
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [editingSubjectValue, setEditingSubjectValue] = useState('');
    const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
    
    // Unit states
    const [newUnitValues, setNewUnitValues] = useState<{ [subjectId: string]: string }>({});
    const [isAddingUnit, setIsAddingUnit] = useState<string | null>(null);
    const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
    const [editingUnitValue, setEditingUnitValue] = useState('');
    const [deletingUnit, setDeletingUnit] = useState<{unit: Unit, subjectId: string} | null>(null);
    
    // Lesson states
    const [lessonDialogState, setLessonDialogState] = useState<{isOpen: boolean, initialData?: Lesson, unit?: Unit, subjectId?: string}>({isOpen: false});
    const [deletingLesson, setDeletingLesson] = useState<{lesson: Lesson, unitId: string, subjectId: string} | null>(null);

    const { toast } = useToast();

    // Course Handlers
    const handleUpdateCourseName = async () => {
        if (editingCourseNameValue.trim() === course.name || !editingCourseNameValue.trim()) {
            setIsEditingCourseName(false);
            return;
        }
        const result = await updateCourseName({ courseId: course.id, newName: editingCourseNameValue });
        if (result.success) {
            toast({ title: 'Course Name Updated' });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            setEditingCourseNameValue(course.name); // Revert on error
        }
        setIsEditingCourseName(false);
    };

    const handleDeleteCourse = async () => {
        if (!deletingCourse) return;
        const result = await deleteCourse({ courseId: deletingCourse.id });
        if (result.success) {
            toast({ title: 'Course Deleted' });
            onContentUpdated(); // This will refresh the list, removing the deleted course
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setDeletingCourse(null);
    };

    const handleUpdateStatus = async (status: 'active' | 'coming-soon' | 'deactivated') => {
        const result = await updateCourseStatus({ courseId: course.id, status });
        if (result.success) {
            toast({ title: "Course Status Updated" });
            onContentUpdated();
        } else {
             toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };


    // Subject Handlers
    const handleAddSubject = async () => {
        if (!newSubject.trim()) return;
        setIsAddingSubject(true);
        const result = await addSubject({ courseId: course.id, subjectName: newSubject });
        if (result.success) {
            toast({ title: 'Subject Added' });
            setNewSubject('');
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsAddingSubject(false);
    };

    const handleUpdateSubject = async () => {
        if (!editingSubjectId || !editingSubjectValue.trim()) return;
        const result = await updateSubject({ courseId: course.id, subjectId: editingSubjectId, newName: editingSubjectValue });
        if (result.success) {
            toast({ title: 'Subject Updated' });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setEditingSubjectId(null);
        setEditingSubjectValue('');
    };

    const handleDeleteSubject = async () => {
        if (!deletingSubject) return;
        const result = await deleteSubject({ courseId: course.id, subjectId: deletingSubject.id });
        if (result.success) {
            toast({ title: 'Subject Deleted' });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setDeletingSubject(null);
    };

    // Unit handlers
    const handleAddUnit = async (subjectId: string) => {
        const newUnitTitle = newUnitValues[subjectId];
        if (!newUnitTitle || !newUnitTitle.trim()) return;
        setIsAddingUnit(subjectId);
        const result = await addUnit({ courseId: course.id, subjectId, unitTitle: newUnitTitle });
        if (result.success) {
            toast({ title: "Unit Added" });
            setNewUnitValues(prev => ({...prev, [subjectId]: ''}));
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setIsAddingUnit(null);
    }
    
    const handleUpdateUnit = async (subjectId: string) => {
        if (!editingUnitId || !editingUnitValue.trim()) return;
        const result = await updateUnit({ courseId: course.id, subjectId: subjectId, unitId: editingUnitId, unitTitle: editingUnitValue });
        if (result.success) {
            toast({ title: "Unit Updated" });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setEditingUnitId(null);
        setEditingUnitValue('');
    }

    const handleDeleteUnit = async () => {
        if (!deletingUnit) return;
        const result = await deleteUnit({ courseId: course.id, subjectId: deletingUnit.subjectId, unitId: deletingUnit.unit.id });
        if (result.success) {
            toast({ title: "Unit Deleted" });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setDeletingUnit(null);
    }

    // Lesson Handlers
    const handleSaveLesson = async (data: Omit<Lesson, 'id'>) => {
        if (!lessonDialogState.subjectId || !lessonDialogState.unit) return;

        const action = lessonDialogState.initialData ? updateLesson : addLesson;
        const payload = lessonDialogState.initialData
            ? { ...data, lessonId: lessonDialogState.initialData.id, unitId: lessonDialogState.unit.id, subjectId: lessonDialogState.subjectId, courseId: course.id, lessonTitle: data.title }
            : { ...data, unitId: lessonDialogState.unit.id, subjectId: lessonDialogState.subjectId, courseId: course.id, lessonTitle: data.title };
        
        const result = await action(payload as any);
        if (result.success) {
            toast({ title: `Lesson ${lessonDialogState.initialData ? 'Updated' : 'Added'}` });
            onContentUpdated();
            setLessonDialogState({ isOpen: false });
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
    }
    
    const handleDeleteLesson = async () => {
        if (!deletingLesson) return;
        const { lesson, unitId, subjectId } = deletingLesson;
        const result = await deleteLesson({ courseId: course.id, subjectId, unitId, lessonId: lesson.id });
        if (result.success) {
            toast({ title: "Lesson Deleted" });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setDeletingLesson(null);
    }

    const courseStatus = course.status || 'active';
    
    const statusBadgeVariant = {
        'active': 'default',
        'coming-soon': 'secondary',
        'deactivated': 'destructive',
    } as const;

    const statusText = {
        'active': 'Active',
        'coming-soon': 'Coming Soon',
        'deactivated': 'Deactivated'
    };

    return (
        <>
            <ConfirmDialog isOpen={!!deletingCourse} onClose={() => setDeletingCourse(null)} onConfirm={handleDeleteCourse} title="Delete Course?" description={`Permanently delete "${deletingCourse?.name}". This action cannot be undone.`} />
            <ConfirmDialog isOpen={!!deletingSubject} onClose={() => setDeletingSubject(null)} onConfirm={handleDeleteSubject} title="Delete Subject?" description={`Permanently delete "${deletingSubject?.name}". All units and lessons inside will also be deleted.`} />
            <ConfirmDialog isOpen={!!deletingUnit} onClose={() => setDeletingUnit(null)} onConfirm={handleDeleteUnit} title="Delete Unit?" description={`Permanently delete "${deletingUnit?.unit.title}". All lessons inside will also be deleted.`} />
            <ConfirmDialog isOpen={!!deletingLesson} onClose={() => setDeletingLesson(null)} onConfirm={handleDeleteLesson} title="Delete Lesson?" description={`Permanently delete the lesson "${deletingLesson?.lesson.title}".`} />
            <ManageLessonDialog 
                isOpen={lessonDialogState.isOpen}
                onClose={() => setLessonDialogState({isOpen: false})}
                onSave={handleSaveLesson}
                initialData={lessonDialogState.initialData}
            />

            <Card>
                <CardHeader>
                    <div className='flex justify-between items-start'>
                        <div className="flex items-center gap-2">
                            <Book className="h-6 w-6 text-primary" />
                            {isEditingCourseName ? (
                                <div className="flex items-center gap-2 w-full">
                                    <Input value={editingCourseNameValue} onChange={(e) => setEditingCourseNameValue(e.target.value)} className="h-9 text-xl font-bold" />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleUpdateCourseName}><Save className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => { setIsEditingCourseName(false); setEditingCourseNameValue(course.name); }}><XCircle className="h-4 w-4" /></Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CardTitle>{course.name}</CardTitle>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingCourseName(true)}><Pencil className="h-4 w-4" /></Button>
                                </div>
                            )}
                        </div>
                        <div className='flex items-center gap-2'>
                             <Badge variant={statusBadgeVariant[courseStatus]}>
                                {statusText[courseStatus]}
                            </Badge>
                             <Select onValueChange={(value: 'active' | 'coming-soon' | 'deactivated') => handleUpdateStatus(value)} value={courseStatus}>
                                <SelectTrigger className='w-[150px] h-8 text-xs'>
                                    <SelectValue placeholder="Change status"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active"><div className='flex items-center gap-2'><CircleDot className="text-green-500"/> Active</div></SelectItem>
                                    <SelectItem value="coming-soon"><div className='flex items-center gap-2'><Circle className="text-orange-500"/> Coming Soon</div></SelectItem>
                                    <SelectItem value="deactivated"><div className='flex items-center gap-2'><CircleSlash className="text-red-500"/> Deactivated</div></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <CardDescription>
                        <div className="flex justify-between items-center">
                            <span>Manage the curriculum for the {course.name.toLowerCase()}.</span>
                            <Button variant="destructive" size="sm" onClick={() => setDeletingCourse(course)}>
                                <Trash className="mr-2 h-4 w-4"/> Delete Course
                            </Button>
                        </div>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input placeholder="Enter new subject name..." value={newSubject} onChange={(e) => setNewSubject(e.target.value)} disabled={isAddingSubject}/>
                        <Button onClick={handleAddSubject} disabled={isAddingSubject} size="sm">{isAddingSubject ? <Loader2 className="h-4 w-4 animate-spin"/> : <><PlusCircle className="mr-2 h-4 w-4"/> Add Subject</>}</Button>
                    </div>
                     <Accordion type="multiple" className="w-full space-y-4">
                        {course.subjects.map(subject => (
                            <AccordionItem value={subject.id} key={subject.id} className="border rounded-lg">
                                <AccordionTrigger className="p-4 hover:no-underline">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-4">
                                            <BookCopy className="h-5 w-5 text-primary" />
                                            {editingSubjectId === subject.id ? (
                                                <div className="flex items-center gap-2 w-full">
                                                    <Input value={editingSubjectValue} onChange={(e) => setEditingSubjectValue(e.target.value)} className="h-8" onClick={(e) => e.stopPropagation()} />
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={(e) => { e.stopPropagation(); handleUpdateSubject();}}><Save className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={(e) => { e.stopPropagation(); setEditingSubjectId(null);}}><XCircle className="h-4 w-4" /></Button>
                                                </div>
                                            ) : (
                                                <span className="font-semibold text-lg">{subject.name}</span>
                                            )}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0 space-y-4">
                                    <Separator />
                                     <div className="flex items-center gap-2 pt-2 justify-end">
                                        <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); setEditingSubjectId(subject.id); setEditingSubjectValue(subject.name);}}>
                                            <Pencil className="h-4 w-4 mr-2" /> Edit Name
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={(e) => {e.stopPropagation(); setDeletingSubject(subject);}}>
                                            <Trash className="h-4 w-4 mr-2" /> Delete Subject
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="Enter new unit title..." 
                                            value={newUnitValues[subject.id] || ''} 
                                            onChange={(e) => setNewUnitValues(prev => ({ ...prev, [subject.id]: e.target.value }))}
                                            disabled={isAddingUnit === subject.id}
                                        />
                                        <Button onClick={() => handleAddUnit(subject.id)} disabled={isAddingUnit === subject.id} size="sm">{isAddingUnit === subject.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <><FolderPlus className="mr-2 h-4 w-4"/> Add Unit</>}</Button>
                                    </div>
                                    {subject.units.length > 0 ? (
                                        <Accordion type="multiple" className="space-y-2">
                                            {subject.units.map(unit => (
                                                 <AccordionItem value={unit.id} key={unit.id} className="border rounded-md px-4">
                                                    <AccordionTrigger className="py-3 hover:no-underline">
                                                         <div className="flex items-center justify-between w-full">
                                                             {editingUnitId === unit.id ? (
                                                                <div className="flex items-center gap-2 w-full pr-4">
                                                                    <Input value={editingUnitValue} onChange={(e) => setEditingUnitValue(e.target.value)} className="h-8" onClick={(e) => e.stopPropagation()} />
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={(e) => { e.stopPropagation(); handleUpdateUnit(subject.id);}}><Save className="h-4 w-4" /></Button>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={(e) => { e.stopPropagation(); setEditingUnitId(null);}}><XCircle className="h-4 w-4" /></Button>
                                                                </div>
                                                             ) : (
                                                                <span className="font-medium text-base">{unit.title}</span>
                                                             )}
                                                         </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pb-4">
                                                        <div className="flex items-center gap-1 pb-2 justify-end">
                                                            <Button size="sm" variant="ghost" onClick={(e) => {e.stopPropagation(); setEditingUnitId(unit.id); setEditingUnitValue(unit.title);}}><Pencil className="h-4 w-4 mr-1" />Edit Unit</Button>
                                                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => {e.stopPropagation(); setDeletingUnit({unit, subjectId: subject.id});}}><Trash className="h-4 w-4 mr-1" />Delete Unit</Button>
                                                        </div>
                                                        <Separator className="mb-4" />
                                                        <Button className="w-full mb-4" variant="outline" size="sm" onClick={() => setLessonDialogState({ isOpen: true, unit: unit, subjectId: subject.id })}>
                                                            <FileVideo className="mr-2 h-4 w-4" /> Add New Lesson to this Unit
                                                        </Button>
                                                        <ul className="space-y-2">
                                                            {unit.lessons.map(lesson => (
                                                                <li key={lesson.id} className="p-2 rounded-md bg-secondary/50 flex items-center justify-between group">
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <Video className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                                        <div className="flex-grow overflow-hidden">
                                                                            <p className="text-sm truncate font-medium">{lesson.title}</p>
                                                                            {lesson.duration && (
                                                                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.duration} min</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setLessonDialogState({ isOpen: true, initialData: lesson, unit: unit, subjectId: subject.id })}><Pencil className="h-4 w-4" /></Button>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeletingLesson({lesson, unitId: unit.id, subjectId: subject.id})}><Trash className="h-4 w-4" /></Button>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                             {unit.lessons.length === 0 && <p className="text-center text-xs text-muted-foreground py-2">No lessons in this unit yet.</p>}
                                                        </ul>
                                                    </AccordionContent>
                                                 </AccordionItem>
                                            ))}
                                        </Accordion>
                                    ) : (
                                        <p className="text-center text-sm text-muted-foreground py-4">No units have been added to this subject yet.</p>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </>
    );
};


export default function ContentPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddCourseOpen, setAddCourseOpen] = useState(false);
    const [newCourseName, setNewCourseName] = useState('');
    const [newCourseStatus, setNewCourseStatus] = useState<'active' | 'coming-soon' | 'deactivated'>('active');
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

    const handleAddCourse = async () => {
        if (!newCourseName.trim()) {
            toast({ variant: 'destructive', title: 'Course name required' });
            return;
        }
        const result = await addCourse({ name: newCourseName, status: newCourseStatus });
        if (result.success) {
            toast({ title: "Course Added", description: `"${newCourseName}" has been created.` });
            fetchCourses();
            setNewCourseName('');
            setNewCourseStatus('active');
            setAddCourseOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    }
    
    return (
        <>
            <Dialog open={isAddCourseOpen} onOpenChange={setAddCourseOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Course</DialogTitle>
                        <DialogDescription>Enter a name and set the initial status for the new course.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="new-course-name">Course Name</Label>
                            <Input id="new-course-name" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="new-course-status">Status</Label>
                            <Select onValueChange={(value: 'active' | 'coming-soon' | 'deactivated') => setNewCourseStatus(value)} value={newCourseStatus}>
                                <SelectTrigger id="new-course-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="coming-soon">Coming Soon</SelectItem>
                                    <SelectItem value="deactivated">Deactivated</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddCourseOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddCourse}>Add Course</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <main className="container mx-auto p-4 md:p-8">
                <div className="mb-8">
                    <Button asChild variant="outline">
                        <Link href="/admin">
                            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                        </Link>
                    </Button>
                </div>

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
                        <p className="mt-2 text-lg text-muted-foreground">
                            Manage all courses and their associated curriculum, including subjects, units, and lessons.
                        </p>
                    </div>
                    <Button onClick={() => setAddCourseOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Course
                    </Button>
                </div>
                
                <div className="space-y-6">
                    {loading ? (
                         <div className="text-center py-12 text-muted-foreground">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
                            <p>Loading course data...</p>
                         </div>
                    ) : courses.length > 0 ? (
                        <div className="space-y-6">
                            {courses.sort((a,b) => a.name.localeCompare(b.name)).map(course => (
                                <CourseContentManager 
                                    key={course.id}
                                    course={course}
                                    onContentUpdated={fetchCourses}
                                />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                            <h3 className="text-xl font-semibold">No Courses Found</h3>
                            <p className="mt-2">Click "Add New Course" to get started.</p>
                        </div>
                    )}
                 </div>
            </main>
        </>
    )
}
