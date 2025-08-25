

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Batch, Participant, Trainer, Course, Subject, Unit, Lesson, SuperAdmin, Organization, OrganizationAdmin } from '@/lib/types';
import { RegistrationsTable } from '@/components/features/registrations-table';
import { EditBatchDialog } from '@/components/features/edit-batch-name-dialog';
import { DeleteBatchDialog } from '@/components/features/delete-batch-dialog';
import { ConfirmDialog } from '@/components/features/confirm-dialog';
import { AddParticipantDialog } from '@/components/features/add-participant-dialog';
import { ImportParticipantsDialog } from '@/components/features/import-participants-dialog';
import { ParticipantsTable } from '@/components/features/participants-table';
import { TrainersTable } from '@/components/features/trainers-table';
import { AddTrainerDialog } from '@/components/features/add-trainer-dialog';
import { AttendanceReport } from '@/components/features/attendance-report';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, UserPlus, Upload, Download, Users, BookUser, BookUp, Presentation, School, Building, Search, Loader2, UserCog, CalendarCheck, BookCopy, ListPlus, Save, XCircle, ChevronRight, FolderPlus, FileVideo, Video, Clock, Lock, Unlock, Replace, CircleDot, Circle, CircleSlash, ShieldCheck, ShieldOff, Phone, UserCircle, Briefcase } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addCourse, updateBatch, getBatches, createBatch, deleteBatch, getParticipants, addParticipant, addParticipantsInBulk, updateParticipant, getTrainers, addTrainer, updateTrainer, deleteTrainer, getCourses, updateCourseName, addSubject, updateSubject, deleteSubject, addUnit, updateUnit, deleteUnit, addLesson, updateLesson, deleteLesson, transferStudents, updateCourseStatus, deleteCourse, addSuperAdmin, getSuperAdmins, deleteSuperAdmin, updateSuperAdmin, isPrimaryAdmin, getOrganizations, addOrganization, getOrganizationAdmins, addOrganizationAdmin, updateOrganizationAdmin, deleteOrganizationAdmin } from '@/app/actions';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

const organizations = [
  "TE Connectivity, Shirwal",
  "BSA Plant, Chakan",
  "Belden India",
  "Other",
];

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
                            <BookCopy className="h-6 w-6 text-primary" />
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
                                            <BookUser className="h-5 w-5 text-primary" />
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

const SuperAdminsTable = ({
    superAdmins,
    onEdit,
    onDelete,
    currentUser
}: {
    superAdmins: (SuperAdmin & {isPrimary: boolean})[];
    onEdit: (admin: SuperAdmin) => void;
    onDelete: (admin: SuperAdmin) => void;
    currentUser: SuperAdmin;
}) => {
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {superAdmins.map(admin => (
                        <TableRow key={admin.id}>
                            <TableCell className="font-medium">
                                {admin.name}
                                {admin.isPrimary && <Badge variant="secondary" className="ml-2">Primary</Badge>}
                            </TableCell>
                            <TableCell>{admin.username}</TableCell>
                            <TableCell>{admin.mobile}</TableCell>
                            <TableCell>
                                {admin.canManageAdmins ? (
                                    <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3"/> Can Manage</Badge>
                                ) : (
                                    <Badge variant="outline"><ShieldOff className="mr-1 h-3 w-3"/> Cannot Manage</Badge>
                                )}
                            </TableCell>
                            <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                {(currentUser.isPrimary || currentUser.canManageAdmins || admin.id === currentUser.id) && admin.id !== currentUser.createdBy && (
                                     <Button variant="ghost" size="icon" onClick={() => onEdit(admin)}>
                                        <Pencil className="h-4 w-4"/>
                                    </Button>
                                )}
                                {(!admin.isPrimary && (currentUser.isPrimary || currentUser.canManageAdmins)) && admin.id !== currentUser.id && admin.id !== currentUser.createdBy && (
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(admin)}>
                                        <Trash className="h-4 w-4"/>
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

const ManageAdminDialog = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    currentUser
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {id?: string; name: string; mobile?: string; username: string; password?: string; canManageAdmins?: boolean; currentUserId?: string}) => Promise<void>;
    initialData?: SuperAdmin | null;
    currentUser?: SuperAdmin | null;
}) => {
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [canManageAdmins, setCanManageAdmins] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setName(initialData?.name || '');
            setMobile(initialData?.mobile || '');
            setUsername(initialData?.username || '');
            setCanManageAdmins(initialData?.canManageAdmins || false);
            setPassword('');
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave({
            id: initialData?.id,
            name,
            mobile,
            username,
            password: password || undefined,
            canManageAdmins: canManageAdmins,
            currentUserId: currentUser?.id,
        });
        setIsSaving(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
              <DialogHeader>
                  <DialogTitle>{initialData?.id === currentUser?.id ? 'Edit My Profile' : initialData ? 'Edit Superadmin' : 'Add New Superadmin'}</DialogTitle>
                  <DialogDescription>{initialData ? `Update details for ${initialData.name}.` : 'Create a new user with administrative privileges.'}</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div>
                      <Label htmlFor="admin-name">Full Name</Label>
                      <Input id="admin-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                      <Label htmlFor="admin-mobile">Mobile Number</Label>
                      <Input id="admin-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                  </div>
                  <Separator />
                  <div>
                      <Label htmlFor="admin-username">Username</Label>
                      <Input id="admin-username" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                   <div>
                      <Label htmlFor="admin-password">Password</Label>
                      <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initialData ? 'Leave blank to keep unchanged' : 'Min 6 characters'} />
                  </div>
                  {currentUser?.isPrimary && (
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="can-manage-admins"
                            checked={canManageAdmins}
                            onCheckedChange={setCanManageAdmins}
                            disabled={initialData?.id === currentUser.id}
                        />
                        <Label htmlFor="can-manage-admins">Allow this admin to manage other admins</Label>
                    </div>
                  )}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (initialData ? 'Save Changes' : 'Add Superadmin')}
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
    )
}


export default function AdminPage() {
  const router = useRouter();
  // Data states
  const [batches, setBatches] = useState<Batch[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [superAdmins, setSuperAdmins] = useState<(SuperAdmin & {isPrimary: boolean})[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationAdmins, setOrganizationAdmins] = useState<OrganizationAdmin[]>([]);
  
  // Auth states
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'superadmin' | 'trainer' | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SuperAdmin | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Dialog states
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isAddParticipantOpen, setAddParticipantOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [isAddTrainerOpen, setAddTrainerOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [deletingTrainerId, setDeletingTrainerId] = useState<string | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<SuperAdmin | null>(null);
  const [isAddCourseOpen, setAddCourseOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SuperAdmin | null>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [editingOrgAdmin, setEditingOrgAdmin] = useState<OrganizationAdmin | null>(null);
  const [isAddOrgAdminOpen, setIsAddOrgAdminOpen] = useState(false);
  const [deletingOrgAdmin, setDeletingOrgAdmin] = useState<OrganizationAdmin | null>(null);

  // Form & Filter states
  const [searchIitpNo, setSearchIitpNo] = useState('');
  const [isFetchingParticipant, setIsFetchingParticipant] = useState(false);
  const [fetchedParticipant, setFetchedParticipant] = useState<Participant | null>(null);
  const [editFormData, setEditFormData] = useState<Omit<Participant, 'createdAt' | 'completedLessons'>>({ id: '', name: '', iitpNo: '', mobile: '', organization: '', enrolledCourses: [], deniedCourses: []});
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseStatus, setNewCourseStatus] = useState<'active' | 'coming-soon' | 'deactivated'>('active');
  const [sourceCourse, setSourceCourse] = useState('');
  const [destinationCourse, setDestinationCourse] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isUpdatingParticipant, setIsUpdatingParticipant] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    const role = sessionStorage.getItem('userRole');
    const actions: Promise<any>[] = [getBatches(), getParticipants(), getTrainers(), getCourses()];
    if (role === 'superadmin') {
        actions.push(getSuperAdmins(), getOrganizations(), getOrganizationAdmins());
    }
    
    const [fetchedBatches, fetchedParticipants, fetchedTrainers, fetchedCourses, fetchedAdmins, fetchedOrgs, fetchedOrgAdmins] = await Promise.all(actions);

    setBatches(fetchedBatches);
    setParticipants(fetchedParticipants);
    setTrainers(fetchedTrainers);
    setCourses(fetchedCourses);
    if(fetchedOrgs) setOrganizations(fetchedOrgs);
    if(fetchedOrgAdmins) setOrganizationAdmins(fetchedOrgAdmins);

    if(fetchedAdmins) {
         const adminsWithPrimaryFlag = await Promise.all(fetchedAdmins.map(async (admin: SuperAdmin) => {
            const { isPrimary } = await isPrimaryAdmin(admin.id);
            return { ...admin, isPrimary };
        }));
        setSuperAdmins(adminsWithPrimaryFlag);
        
        // Update current user state if they are a superadmin
        const userJson = sessionStorage.getItem('user');
        if (userJson) {
            const user = JSON.parse(userJson);
            const userWithPrimary = adminsWithPrimaryFlag.find(a => a.id === user.id);
            if(userWithPrimary) {
                setCurrentUser(userWithPrimary);
            }
        }
    }
  }, []);
  
  useEffect(() => {
    setIsClient(true);
    // Check session storage for auth state
    const role = sessionStorage.getItem('userRole') as 'superadmin' | 'trainer' | null;
    const id = sessionStorage.getItem('trainerId');
    const userJson = sessionStorage.getItem('user');


    if(role) {
        setIsAuthenticated(true);
        setUserRole(role);
        if(role === 'trainer' && id) {
            setTrainerId(id);
        }
        if (userJson) {
            setCurrentUser(JSON.parse(userJson));
        }
        fetchAllData();
    } else {
        router.push('/login');
    }
    setLoadingAuth(false);
  }, [fetchAllData, router]);

  useEffect(() => {
    if (fetchedParticipant) {
      setEditFormData({
        id: fetchedParticipant.id,
        name: fetchedParticipant.name,
        iitpNo: fetchedParticipant.iitpNo,
        mobile: fetchedParticipant.mobile || '',
        organization: fetchedParticipant.organization || '',
        enrolledCourses: fetchedParticipant.enrolledCourses || [],
        deniedCourses: fetchedParticipant.deniedCourses || [],
      });
    } else {
       setEditFormData({ id: '', name: '', iitpNo: '', mobile: '', organization: '', enrolledCourses: [], deniedCourses: []});
    }
  }, [fetchedParticipant]);


  const filteredBatches = useMemo(() => {
    if (userRole === 'trainer' && trainerId) {
        return batches.filter(batch => batch.trainerId === trainerId);
    }
    return batches;
  }, [batches, userRole, trainerId]);

  const reportStats = useMemo(() => {
    const courseStats: { [courseName: string]: { enrollments: number; sessions: number; } } = {};
    
    courses.forEach(course => {
        if(course.status === 'active') {
            courseStats[course.name] = { enrollments: 0, sessions: 0 };
        }
    });

    let totalActiveEnrollments = 0;
    const organizationSet = new Set<string>();
    
    participants.forEach(participant => {
        if (participant.organization) {
            organizationSet.add(participant.organization);
        }
        
        participant.enrolledCourses?.forEach(enrolledCourseName => {
            const course = courses.find(c => c.name.toLowerCase() === enrolledCourseName.toLowerCase());
            
            if (course && course.status === 'active' && !(participant.deniedCourses || []).includes(course.id)) {
                if (courseStats[course.name]) {
                    courseStats[course.name].enrollments += 1;
                }
            }
        });
    });

    const activeEnrollments = new Set<string>();
    participants.forEach(p => {
        p.enrolledCourses?.forEach(enrolledCourseName => {
            const course = courses.find(c => c.name.toLowerCase() === enrolledCourseName.toLowerCase());
             if (course && course.status === 'active' && !(p.deniedCourses || []).includes(course.id)) {
                activeEnrollments.add(`${p.id}-${course.id}`);
            }
        })
    });
    totalActiveEnrollments = activeEnrollments.size;


    batches.forEach(batch => {
        const course = courses.find(c => c.name === batch.course);
        if (course && courseStats[course.name]) {
            courseStats[course.name].sessions += 1;
        }
    });
    
    const activeCourseStats = Object.entries(courseStats)
      .filter(([_, stats]) => stats.enrollments > 0 || stats.sessions > 0)
      .reduce((acc, [name, stats]) => {
          acc[name] = stats;
          return acc;
      }, {} as typeof courseStats);


    return {
        courseStats: activeCourseStats,
        totalActiveEnrollments,
        totalSessions: batches.length,
        totalOrganizations: organizations.length,
        totalTrainers: trainers.length,
    };
  }, [participants, batches, trainers, courses, organizations]);
  
  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
  };

  const handleDeleteBatch = (batch: Batch) => {
    setDeletingBatch(batch);
  };
  
  const handleSaveBatch = async (details: { name: string; course: any; startDate?: Date; startTime: string; endTime: string; trainerId: string; }) => {
    if (!editingBatch) return;

    const result = await updateBatch(editingBatch.id, {
        name: details.name,
        course: details.course,
        startDate: details.startDate?.toISOString(),
        startTime: details.startTime,
        endTime: details.endTime,
        trainerId: details.trainerId,
    });

    if (result.success) {
      toast({
          title: "Batch Updated",
          description: `Batch "${details.name}" has been saved.`,
      });
      fetchAllData();
    } else {
      toast({
          variant: "destructive",
          title: "Database Error",
          description: result.error || "Could not save the updated batch name.",
      });
    }
    setEditingBatch(null);
  };

  const handleCreateBatch = async (details: { name: string; course: any; startDate?: Date; startTime: string; endTime: string; trainerId: string; }) => {
    if (!details.startDate) {
        toast({
            variant: "destructive",
            title: "Missing Date",
            description: "Start date is required to create a batch.",
        });
        return;
    }
     if (!details.startTime || !details.endTime) {
        toast({
            variant: "destructive",
            title: "Missing Time",
            description: "Start and end times are required.",
        });
        return;
    }

    const result = await createBatch({
        name: details.name,
        course: details.course,
        startDate: details.startDate,
        startTime: details.startTime,
        endTime: details.endTime,
        trainerId: details.trainerId,
    });

    if (result.success) {
        toast({
            title: "Batch Created",
            description: `New batch "${details.name}" was successfully created.`,
        });
        fetchAllData();
        setCreateDialogOpen(false);
    } else {
        toast({
            variant: "destructive",
            title: "Error Creating Batch",
            description: result.error || "Could not create the new batch.",
        });
    }
  }

  const confirmDeleteBatch = async () => {
    if (!deletingBatch) return;

    const result = await deleteBatch(deletingBatch.id);

    if(result.success) {
        toast({
            title: "Batch Deleted",
            description: `The batch "${deletingBatch.name}" has been permanently removed.`,
        });
        fetchAllData();
    } else {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Could not delete the batch."
        });
    }
    setDeletingBatch(null);
  }

  const handleAddParticipant = async (details: Omit<Participant, 'id' | 'createdAt' | 'completedLessons' | 'deniedCourses'>) => {
    const result = await addParticipant(details);
    if(result.success) {
        toast({
            title: "Participant Added",
            description: `${details.name} has been added to the central directory.`,
        });
        fetchAllData();
        setAddParticipantOpen(false);
    } else {
        toast({
            variant: "destructive",
            title: "Error Adding Participant",
            description: result.error || "Could not add the participant."
        });
    }
  };

  const handleFetchParticipant = async () => {
    if (!searchIitpNo.trim()) {
      toast({
        variant: 'destructive',
        title: 'IITP No Required',
        description: 'Please enter an IITP No to search.',
      });
      return;
    }
    setIsFetchingParticipant(true);
    setFetchedParticipant(null);
    
    // We can search the client-side list first for speed
    const found = participants.find(p => p.iitpNo === searchIitpNo.trim());

    if (found) {
        setFetchedParticipant(found);
    } else {
        toast({
            variant: 'destructive',
            title: 'Not Found',
            description: `No participant found with IITP No: ${searchIitpNo}`
        });
    }

    setIsFetchingParticipant(false);
  }

  const handleUpdateParticipant = async () => {
    if (!editFormData.id) return;
    
    setIsUpdatingParticipant(true);
    const result = await updateParticipant({
      ...editFormData,
      enrolledCourses: Array.isArray(editFormData.enrolledCourses) ? editFormData.enrolledCourses : String(editFormData.enrolledCourses).split(',').map(c => c.trim()).filter(Boolean),
      id: fetchedParticipant?.id || '',
      completedLessons: fetchedParticipant?.completedLessons || [],
      deniedCourses: editFormData.deniedCourses || [],
    });
    
    if (result.success) {
      toast({
        title: 'Participant Updated',
        description: `Details for ${editFormData.name} have been saved.`,
      });
      fetchAllData();
      setFetchedParticipant(null); // Clear the form
      setSearchIitpNo('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: result.error || 'Could not update participant.',
      });
    }
    setIsUpdatingParticipant(false);
  };


  const handleDownloadTemplate = () => {
    const headers = "name,iitpNo,mobile,organization,enrolledCourses\n";
    const example = "John Doe,IIPT123,1234567890,Example Org,\"Course A, Course B\"\n";
    const csvContent = headers + example;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'participants_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSave = async (importedParticipants: Omit<Participant, 'id'|'createdAt'|'completedLessons'|'deniedCourses'>[]) => {
    if (importedParticipants.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Participants',
        description: 'No valid participant data was found in the file to import.',
      });
      return;
    }

    const result = await addParticipantsInBulk(importedParticipants);

    if (result.success) {
      const successfulCount = importedParticipants.length - (result.skippedCount || 0);
      toast({
        title: 'Import Complete',
        description: `${successfulCount} participants have been added. ${result.skippedCount || 0} were skipped.`,
      });
      fetchAllData();
      setImportDialogOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: result.error || 'An unexpected error occurred during the bulk import.',
      });
    }

  };
  
  // Trainer Handlers
  const handleSaveTrainer = async (details: { id?: string; name: string; mobile?: string; meetingLink: string; username: string; password?: string; }) => {
    const action = editingTrainer ? updateTrainer : addTrainer;
    const payload = editingTrainer ? { ...details, id: editingTrainer.id } : details;

    const result = await action(payload as any); // Cast needed due to overload

    if (result.success) {
      toast({
        title: `Trainer ${editingTrainer ? 'Updated' : 'Added'}`,
        description: `${details.name} has been saved successfully.`,
      });
      fetchAllData();
      setEditingTrainer(null);
      setAddTrainerOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: `Error ${editingTrainer ? 'Updating' : 'Adding'} Trainer`,
        description: result.error || `Could not save the trainer.`,
      });
    }
  }

  const handleDeleteTrainer = async () => {
    if (!deletingTrainerId) return;

    const result = await deleteTrainer(deletingTrainerId);
    if(result.success) {
      toast({
        title: 'Trainer Deleted',
        description: 'The trainer has been removed.',
      });
      fetchAllData();
    } else {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: result.error || 'Could not delete the trainer.',
      });
    }
    setDeletingTrainerId(null);
  }

  const handleStudentTransfer = async () => {
    if (!sourceCourse || !destinationCourse) {
        toast({ variant: 'destructive', title: 'Selection Required', description: 'Please select both a source and a destination course.' });
        return;
    }
    setIsTransferring(true);
    const result = await transferStudents({ sourceCourseName: sourceCourse, destinationCourseName: destinationCourse });
    if (result.success) {
        toast({
            title: "Transfer Complete",
            description: `${result.transferredCount || 0} student(s) were enrolled in ${destinationCourse}.`
        });
        fetchAllData(); // Refresh data to reflect changes
        setSourceCourse('');
        setDestinationCourse('');
    } else {
        toast({ variant: 'destructive', title: 'Transfer Failed', description: result.error });
    }
    setIsTransferring(false);
  };

  const handleAddCourse = async () => {
      if(!newCourseName.trim()) {
          toast({ variant: 'destructive', title: 'Course name required' });
          return;
      }
      const result = await addCourse({ name: newCourseName, status: newCourseStatus });
      if (result.success) {
          toast({ title: "Course Added", description: `"${newCourseName}" has been created.` });
          fetchAllData();
          setNewCourseName('');
          setNewCourseStatus('active');
          setAddCourseOpen(false);
      } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
  }

  const handleSaveAdmin = async (data: {id?: string; name: string; mobile?: string; username: string; password?: string; canManageAdmins?: boolean; currentUserId?: string}) => {
    const action = data.id ? updateSuperAdmin : addSuperAdmin;
    const result = await action(data as any);
    if (result.success) {
        toast({ title: `Superadmin ${data.id ? 'Updated' : 'Added'}` });
        fetchAllData();
        setEditingAdmin(null);
        setIsAddAdminOpen(false);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  }
  
  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return;
    const result = await deleteSuperAdmin(deletingAdmin.id);
    if (result.success) {
        toast({ title: "Admin Deleted" });
        fetchAllData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setDeletingAdmin(null);
  }

  const handleAddOrganization = async () => {
      if (!newOrgName.trim()) {
          toast({ variant: 'destructive', title: 'Organization name required' });
          return;
      }
      const result = await addOrganization({ name: newOrgName });
      if(result.success) {
          toast({ title: "Organization Added" });
          fetchAllData();
          setNewOrgName('');
          setIsAddOrgOpen(false);
      } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
  }

  const handleSaveOrgAdmin = async (data: {id?: string; name: string; username: string; password?: string; organizationName: string;}) => {
      const action = data.id ? updateOrganizationAdmin : addOrganizationAdmin;
      const result = await action(data as any);
      if(result.success) {
          toast({ title: `Organization Admin ${data.id ? 'Updated' : 'Added'}` });
          fetchAllData();
          setEditingOrgAdmin(null);
          setIsAddOrgAdminOpen(false);
      } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
  }

  const handleDeleteOrgAdmin = async () => {
      if(!deletingOrgAdmin) return;
      const result = await deleteOrganizationAdmin(deletingOrgAdmin.id);
      if(result.success) {
          toast({ title: "Organization Admin Deleted" });
          fetchAllData();
      } else {
           toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
      setDeletingOrgAdmin(null);
  }


  if (!isClient || loadingAuth) {
    return (
        <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
    );
  }

  if (!isAuthenticated) {
    // This should ideally not be seen as the useEffect redirects, but it's a fallback.
    return (
        <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
             <Card className="w-full max-w-md">
                 <CardHeader>
                     <CardTitle>Redirecting</CardTitle>
                     <CardDescription>You are not authenticated. Redirecting to login...</CardDescription>
                 </CardHeader>
             </Card>
        </main>
    )
  }
  
  const handleCourseAccessChange = (courseId: string, status: 'granted' | 'denied') => {
    const currentDenied = editFormData.deniedCourses || [];
    if (status === 'denied') {
        // Add to denied list if not already there
        if (!currentDenied.includes(courseId)) {
            setEditFormData(prev => ({...prev, deniedCourses: [...currentDenied, courseId]}));
        }
    } else {
        // Remove from denied list
        setEditFormData(prev => ({...prev, deniedCourses: currentDenied.filter(id => id !== courseId)}));
    }
  };

  const getEnrolledCoursesForParticipant = () => {
    if (!fetchedParticipant?.enrolledCourses) return [];
    return courses.filter(c => fetchedParticipant.enrolledCourses?.includes(c.name));
  };


  const SuperAdminTabs = () => (
    <TabsList className="grid w-full grid-cols-8">
        <TabsTrigger value="reports">Reports</TabsTrigger>
        <TabsTrigger value="trainings">Trainings</TabsTrigger>
        <TabsTrigger value="courses">Courses</TabsTrigger>
        <TabsTrigger value="users">All Users</TabsTrigger>
        <TabsTrigger value="trainers">Trainers</TabsTrigger>
        <TabsTrigger value="organizations">Organizations</TabsTrigger>
        <TabsTrigger value="admins">Admins</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
    </TabsList>
  );

  const TrainerTabs = () => (
    <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="trainings">My Trainings</TabsTrigger>
        <TabsTrigger value="attendance">My Attendance</TabsTrigger>
    </TabsList>
  );

  return (
    <>
      <ConfirmDialog isOpen={!!deletingAdmin} onClose={() => setDeletingAdmin(null)} onConfirm={handleDeleteAdmin} title="Delete Superadmin?" description={`This will permanently delete the admin account for "${deletingAdmin?.username}". This action cannot be undone.`} />
      <DeleteBatchDialog 
        isOpen={!!deletingBatch}
        onClose={() => setDeletingBatch(null)}
        onConfirm={confirmDeleteBatch}
        batchName={deletingBatch?.name || ''}
      />
      {(editingBatch || isCreateDialogOpen) && (
        <EditBatchDialog
            isOpen={!!editingBatch || isCreateDialogOpen}
            onClose={() => { setEditingBatch(null); setCreateDialogOpen(false); }}
            onSave={editingBatch ? handleSaveBatch : handleCreateBatch}
            initialData={editingBatch ? {
                name: editingBatch.name,
                course: editingBatch.course,
                startDate: editingBatch.startDate,
                startTime: editingBatch.startTime,
                endTime: editingBatch.endTime,
                trainerId: editingBatch.trainerId,
            } : undefined}
            trainers={trainers}
            courses={courses}
            userRole={userRole}
            currentTrainerId={trainerId}
        />
      )}
       <AddParticipantDialog 
        isOpen={isAddParticipantOpen}
        onClose={() => setAddParticipantOpen(false)}
        onSave={handleAddParticipant}
        courses={courses}
        organizations={organizations}
      />
      <ImportParticipantsDialog
        isOpen={isImportDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSave={handleImportSave}
      />
      {(isAddTrainerOpen || editingTrainer) && (
        <AddTrainerDialog
            isOpen={isAddTrainerOpen || !!editingTrainer}
            onClose={() => { setAddTrainerOpen(false); setEditingTrainer(null); }}
            onSave={handleSaveTrainer}
            initialData={editingTrainer}
        />
      )}
       <DeleteBatchDialog
          isOpen={!!deletingTrainerId}
          onClose={() => setDeletingTrainerId(null)}
          onConfirm={handleDeleteTrainer}
          batchName={`the trainer: ${trainers.find(t => t.id === deletingTrainerId)?.name || 'N/A'}`}
      />
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
      <ManageAdminDialog 
        isOpen={isAddAdminOpen || !!editingAdmin}
        onClose={() => {setIsAddAdminOpen(false); setEditingAdmin(null);}}
        onSave={handleSaveAdmin}
        initialData={editingAdmin}
        currentUser={currentUser}
      />
      {/* TODO: Add Organization Admin Dialog */}


      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <div className="flex flex-col">
              <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
                  {currentUser ? `Welcome, ${currentUser.name}` : (userRole === 'superadmin' ? 'Admin Dashboard' : 'Trainer Dashboard')}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                   {userRole === 'superadmin' ? 'Manage training batches, registrations, and participants.' : 'Manage your assigned training batches.'}
              </p>
          </div>
          <div className="flex items-center gap-2">
            {userRole === 'superadmin' && currentUser && (
                <Button variant="outline" size="sm" onClick={() => setEditingAdmin(currentUser)}>
                    <UserCircle className="mr-2 h-4 w-4"/> My Profile
                </Button>
            )}
            <Button variant="outline" onClick={() => {
                    sessionStorage.clear();
                    router.push('/login');
            }}>Logout</Button>
          </div>
        </div>

        <Tabs defaultValue="reports" className="w-full">
          {userRole === 'superadmin' ? <SuperAdminTabs /> : <TrainerTabs />}
          
          {userRole === 'superadmin' && (
            <TabsContent value="reports" className="mt-6">
                <Card>
                <CardHeader>
                    <CardTitle>Reports</CardTitle>
                    <CardDescription>A high-level overview of your training statistics.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                    <h3 className="text-lg font-medium text-primary">Student Enrollments</h3>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-primary" />
                            <p className="text-2xl font-bold">{reportStats.totalActiveEnrollments}</p>
                            <p className="text-sm text-muted-foreground">Total Active Enrollments</p>
                            </div>
                        </Card>
                        {Object.entries(reportStats.courseStats).map(([courseName, stats]) => (
                            stats.enrollments > 0 && (
                                <Card key={courseName} className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                    <BookUser className="h-8 w-8 text-primary" />
                                    <p className="text-2xl font-bold">{stats.enrollments}</p>
                                    <p className="text-sm text-muted-foreground">{courseName} Students</p>
                                    </div>
                                </Card>
                            )
                            ))}
                    </div>
                    </div>

                    <div>
                    <h3 className="text-lg font-medium text-primary">Training Sessions</h3>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Presentation className="h-8 w-8 text-primary" />
                            <p className="text-2xl font-bold">{reportStats.totalSessions}</p>
                            <p className="text-sm text-muted-foreground">Total Sessions</p>
                        </div>
                        </Card>
                        {Object.entries(reportStats.courseStats).map(([courseName, stats]) => (
                            stats.sessions > 0 && (
                                <Card key={courseName} className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <School className="h-8 w-8 text-primary" />
                                        <p className="text-2xl font-bold">{stats.sessions}</p>
                                        <p className="text-sm text-muted-foreground">{courseName} Sessions</p>
                                    </div>
                                </Card>
                            )
                        ))}
                    </div>
                    </div>
                    
                    <div>
                    <h3 className="text-lg font-medium text-primary">Other</h3>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Building className="h-8 w-8 text-primary" />
                            <p className="text-2xl font-bold">{reportStats.totalOrganizations}</p>
                            <p className="text-sm text-muted-foreground">Total Organizations</p>
                        </div>
                        </Card>
                        <Card className="p-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <UserCog className="h-8 w-8 text-primary" />
                            <p className="text-2xl font-bold">{reportStats.totalTrainers}</p>
                            <p className="text-sm text-muted-foreground">Total Trainers</p>
                        </div>
                        </Card>
                    </div>
                    </div>
                </CardContent>
                </Card>
            </TabsContent>
           )}
          
          <TabsContent value="trainings" className="mt-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Training Batches</CardTitle>
                    <CardDescription>View and manage all training batches and their registrations.</CardDescription>
                  </div>
                  {(userRole === 'superadmin' || userRole === 'trainer') && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Batch
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {filteredBatches && filteredBatches.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {filteredBatches.map(batch => (
                            <AccordionItem key={batch.id} value={`batch-${batch.id}`}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4">
                                      <div className="flex items-center gap-4">
                                        <span>
                                            {batch.name} 
                                        </span>
                                         <Badge variant={batch.course === 'Diploma' ? 'default' : batch.course === 'Advance Diploma' ? 'secondary' : 'outline'}>
                                            {batch.course}
                                        </Badge>
                                      </div>
                                      <span className="text-sm text-muted-foreground">
                                        {batch.registrations.length} registration(s)
                                      </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  {userRole === 'superadmin' && (
                                    <div className="flex justify-end items-center pb-4 gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handleEditBatch(batch)}
                                        >
                                            <Pencil className="mr-2 h-4 w-4" /> Edit Batch
                                        </Button>
                                        <Button 
                                            variant="destructive" 
                                            size="sm"
                                            onClick={() => handleDeleteBatch(batch)}
                                        >
                                            <Trash className="mr-2 h-4 w-4" /> Delete Batch
                                        </Button>
                                    </div>
                                  )}
                                    <RegistrationsTable 
                                        registrations={batch.registrations}
                                        batchName={batch.name}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>No batches found.</p>
                      {(userRole === 'superadmin' || userRole === 'trainer') && <p>Click "Create New Batch" to get started.</p>}
                    </div>
                  )}
                </CardContent>
            </Card>
          </TabsContent>

          {userRole === 'superadmin' && (
            <>
                <TabsContent value="courses" className="mt-6">
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => setAddCourseOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New Course
                        </Button>
                    </div>
                    {courses.length > 0 ? (
                        <div className="space-y-6">
                            {courses.sort((a,b) => a.name.localeCompare(b.name)).map(course => (
                                <CourseContentManager 
                                    key={course.id}
                                    course={course}
                                    onContentUpdated={fetchAllData}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
                        <p>Loading course data...</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                    <Card>
                    <CardHeader>
                        <CardTitle>Participant Management</CardTitle>
                        <CardDescription>A central place to add, update, import, and view all participants.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="directory" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="directory">Directory</TabsTrigger>
                            <TabsTrigger value="add">Add / Import</TabsTrigger>
                            <TabsTrigger value="update">Update User</TabsTrigger>
                            <TabsTrigger value="transfer">Course Transfer</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="directory" className="mt-6">
                            <ParticipantsTable participants={participants} />
                        </TabsContent>

                        <TabsContent value="add" className="mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                <CardTitle>Add a New Participant</CardTitle>
                                <CardDescription>Manually add a single participant to the directory.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                <Button onClick={() => setAddParticipantOpen(true)} className="w-full">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Add New Participant
                                </Button>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                <CardTitle>Import from CSV</CardTitle>
                                <CardDescription>Bulk upload participants from a CSV file.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                <Button onClick={() => setImportDialogOpen(true)} className="w-full">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Import from CSV
                                </Button>
                                <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Template
                                </Button>
                                </CardContent>
                            </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="update" className="mt-6">
                            <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle>Update User Details</CardTitle>
                                <CardDescription>Fetch a user by their IITP No. to edit their details and manage course access.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="searchIitpNo" className="sr-only">IITP No</Label>
                                    <Input 
                                        id="searchIitpNo"
                                        placeholder="Enter IITP No to fetch details..."
                                        value={searchIitpNo}
                                        onChange={(e) => setSearchIitpNo(e.target.value)}
                                        className="max-w-xs"
                                    />
                                    <Button onClick={handleFetchParticipant} disabled={isFetchingParticipant}>
                                        {isFetchingParticipant ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                                        Fetch Details
                                    </Button>
                                </div>
                                {fetchedParticipant && (
                                    <div className="border rounded-lg p-4 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-name">Name</Label>
                                                <Input id="edit-name" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-iitpNo">IITP No</Label>
                                                <Input id="edit-iitpNo" value={editFormData.iitpNo} onChange={e => setEditFormData({...editFormData, iitpNo: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-mobile">Mobile No</Label>
                                                <Input id="edit-mobile" value={editFormData.mobile} onChange={e => setEditFormData({...editFormData, mobile: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-organization">Organization</Label>
                                                <Select onValueChange={(value) => setEditFormData({...editFormData, organization: value})} value={editFormData.organization}>
                                                    <SelectTrigger id="edit-organization">
                                                        <SelectValue placeholder="Select an organization" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                    {organizations.map((org) => (
                                                        <SelectItem key={org.id} value={org.name}>
                                                        {org.name}
                                                        </SelectItem>
                                                    ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2 col-span-1 md:col-span-2">
                                                <Label htmlFor="edit-courses">Enrolled Courses (comma-separated)</Label>
                                                <Input
                                                    id="edit-courses"
                                                    value={Array.isArray(editFormData.enrolledCourses) ? editFormData.enrolledCourses.join(', ') : editFormData.enrolledCourses}
                                                    onChange={e => setEditFormData({...editFormData, enrolledCourses: e.target.value.split(',').map(c => c.trim())})}
                                                    placeholder="Course A, Course B, ..."
                                                />
                                            </div>
                                        </div>
                                        <Separator/>
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Course Access</Label>
                                            <div className="space-y-2">
                                                {getEnrolledCoursesForParticipant().length > 0 ? getEnrolledCoursesForParticipant().map(course => (
                                                    <div key={course.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                                                        <p className="font-medium">{course.name}</p>
                                                        <Select
                                                        value={editFormData.deniedCourses?.includes(course.id) ? 'denied' : 'granted'}
                                                        onValueChange={(status: 'granted' | 'denied') => handleCourseAccessChange(course.id, status)}
                                                        >
                                                        <SelectTrigger className="w-[180px]">
                                                            <SelectValue placeholder="Set access" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="granted"><div className="flex items-center gap-2"><Unlock className="h-4 w-4 text-green-600"/> Granted</div></SelectItem>
                                                            <SelectItem value="denied"><div className="flex items-center gap-2"><Lock className="h-4 w-4 text-red-600"/> Denied</div></SelectItem>
                                                        </SelectContent>
                                                        </Select>
                                                    </div>
                                                )) : <p className="text-sm text-muted-foreground">This user is not enrolled in any courses.</p>}
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-2 flex justify-end gap-2 pt-4">
                                            <Button variant="outline" onClick={() => {setFetchedParticipant(null); setSearchIitpNo('');}}>Cancel</Button>
                                            <Button onClick={handleUpdateParticipant} disabled={isUpdatingParticipant}>
                                                {isUpdatingParticipant ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Update Details'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="transfer">
                            <Card className="border-dashed">
                                <CardHeader>
                                    <CardTitle>Bulk Course Transfer</CardTitle>
                                    <CardDescription>Enroll all students from a source course into a destination course. Useful for fixing inconsistent course names.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                        <div className="space-y-2">
                                            <Label htmlFor="source-course">From Course Name</Label>
                                            <Input
                                                id="source-course"
                                                placeholder="Enter the exact source course name"
                                                value={sourceCourse}
                                                onChange={(e) => setSourceCourse(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="dest-course">To Course</Label>
                                            <Select onValueChange={setDestinationCourse} value={destinationCourse}>
                                                <SelectTrigger id="dest-course">
                                                    <SelectValue placeholder="Select destination course" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                {courses.map(course => <SelectItem key={course.id} value={course.name}>{course.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button onClick={handleStudentTransfer} disabled={isTransferring || !sourceCourse || !destinationCourse}>
                                            {isTransferring ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Replace className="mr-2 h-4 w-4"/>}
                                            {isTransferring ? 'Transferring...' : 'Transfer Students'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        </Tabs>
                    </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="trainers" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                            <CardTitle>Trainer Management</CardTitle>
                            <CardDescription>Add, edit, or remove trainers from the system.</CardDescription>
                            </div>
                            <Button onClick={() => setAddTrainerOpen(true)}>
                                <UserCog className="mr-2 h-4 w-4" />
                                Add New Trainer
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <TrainersTable 
                                trainers={trainers}
                                onEdit={(trainer) => setEditingTrainer(trainer)}
                                onDelete={(trainer) => setDeletingTrainerId(trainer.id)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="organizations" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                <CardTitle>Organizations</CardTitle>
                                <CardDescription>Manage the list of participating organizations.</CardDescription>
                                </div>
                                <Button size="sm" onClick={() => setIsAddOrgOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Organization
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Date Added</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {organizations.map(org => (
                                                <TableRow key={org.id}>
                                                    <TableCell className="font-medium">{org.name}</TableCell>
                                                    <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                             <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                <CardTitle>Organization Admins</CardTitle>
                                <CardDescription>Manage representative accounts for each organization.</CardDescription>
                                </div>
                                <Button size="sm" onClick={() => setIsAddOrgAdminOpen(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Add Admin
                                </Button>
                            </CardHeader>
                             <CardContent>
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Organization</TableHead>
                                                <TableHead>Username</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {organizationAdmins.map(admin => (
                                                <TableRow key={admin.id}>
                                                    <TableCell className="font-medium">{admin.name}</TableCell>
                                                    <TableCell><Badge variant="secondary">{admin.organizationName}</Badge></TableCell>
                                                    <TableCell>{admin.username}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => setEditingOrgAdmin(admin)}><Pencil className="h-4 w-4"/></Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingOrgAdmin(admin)}><Trash className="h-4 w-4"/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                 <TabsContent value="admins" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Superadmin Management</CardTitle>
                                <CardDescription>Manage users with full administrative privileges.</CardDescription>
                            </div>
                            {(currentUser?.isPrimary || currentUser?.canManageAdmins) && (
                                <Button onClick={() => setIsAddAdminOpen(true)}>
                                    <ShieldCheck className="mr-2 h-4 w-4" /> Add Superadmin
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {currentUser && (
                                <SuperAdminsTable 
                                    superAdmins={superAdmins}
                                    onEdit={(admin) => setEditingAdmin(admin)}
                                    onDelete={(admin) => setDeletingAdmin(admin)}
                                    currentUser={currentUser}
                                />
                            )}
                        </CardContent>
                    </Card>
                 </TabsContent>
            </>
          )}

          <TabsContent value="attendance" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Report</CardTitle>
                    <CardDescription>View and export participant attendance for Diploma and Advance Diploma courses.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AttendanceReport 
                        participants={participants}
                        batches={filteredBatches}
                    />
                </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </>
  );
}
