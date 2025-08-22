

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Batch, Participant, Trainer, Course, Subject, Unit, Lesson } from '@/lib/types';
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
import { Pencil, PlusCircle, Trash, UserPlus, Upload, Download, Users, BookUser, BookUp, Presentation, School, Building, Search, Loader2, UserCog, CalendarCheck, BookCopy, ListPlus, Save, XCircle, ChevronRight, FolderPlus, FileVideo, Video } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateBatch, getBatches, createBatch, deleteBatch, getParticipants, addParticipant, addParticipantsInBulk, updateParticipant, getTrainers, addTrainer, updateTrainer, deleteTrainer, getCourses, addSubject, updateSubject, deleteSubject, addUnit, updateUnit, deleteUnit, addLesson, updateLesson, deleteLesson } from '@/app/actions';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    courseId,
    subjectId,
    unitId,
} : {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Lesson, 'id'>) => Promise<void>;
    initialData?: Lesson;
    courseId: string;
    subjectId: string;
    unitId: string;
}) => {
    const [title, setTitle] = useState('');
    const [videoUrl, setVideoUrl] = useState('');

    useEffect(() => {
        if(isOpen) {
            setTitle(initialData?.title || '');
            setVideoUrl(initialData?.videoUrl || '');
        }
    }, [isOpen, initialData])

    const handleSave = () => {
        onSave({ title, videoUrl });
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
                    <DialogDescription>Fill in the details for this lesson.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="lesson-title">Lesson Title</Label>
                        <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lesson-url">Video URL (YouTube, Vimeo, etc.)</Label>
                        <Input id="lesson-url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Lesson</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const CourseContentManager = ({ course, onContentUpdated }: { course: Course; onContentUpdated: () => void; }) => {
    const [newSubject, setNewSubject] = useState('');
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [editingSubjectValue, setEditingSubjectValue] = useState('');
    const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
    
    // States for units
    const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
    const [newUnit, setNewUnit] = useState('');
    const [isAddingUnit, setIsAddingUnit] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [editingUnitValue, setEditingUnitValue] = useState('');
    const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
    
    // States for lessons
    const [activeUnit, setActiveUnit] = useState<Unit | null>(null);
    const [lessonDialogState, setLessonDialogState] = useState<{isOpen: boolean, initialData?: Lesson, unit?: Unit}>({isOpen: false});
    const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);

    const { toast } = useToast();

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
        if (!editingSubject || !editingSubjectValue.trim()) return;
        const result = await updateSubject({ courseId: course.id, subjectId: editingSubject.id, newName: editingSubjectValue });
        if (result.success) {
            toast({ title: 'Subject Updated' });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setEditingSubject(null);
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
    const handleAddUnit = async () => {
        if (!activeSubject || !newUnit.trim()) return;
        setIsAddingUnit(true);
        const result = await addUnit({ courseId: course.id, subjectId: activeSubject.id, unitTitle: newUnit });
        if (result.success) {
            toast({ title: "Unit Added" });
            setNewUnit('');
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setIsAddingUnit(false);
    }
    
    const handleUpdateUnit = async () => {
        if (!activeSubject || !editingUnit || !editingUnitValue.trim()) return;
        const result = await updateUnit({ courseId: course.id, subjectId: activeSubject.id, unitId: editingUnit.id, unitTitle: editingUnitValue });
        if (result.success) {
            toast({ title: "Unit Updated" });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setEditingUnit(null);
    }

    const handleDeleteUnit = async () => {
        if (!activeSubject || !deletingUnit) return;
        const result = await deleteUnit({ courseId: course.id, subjectId: activeSubject.id, unitId: deletingUnit.id });
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
        if (!activeSubject || !lessonDialogState.unit) return;

        const action = lessonDialogState.initialData ? updateLesson : addLesson;
        const payload = lessonDialogState.initialData
            ? { ...data, lessonId: lessonDialogState.initialData.id, unitId: lessonDialogState.unit.id, subjectId: activeSubject.id, courseId: course.id, lessonTitle: data.title }
            : { ...data, unitId: lessonDialogState.unit.id, subjectId: activeSubject.id, courseId: course.id, lessonTitle: data.title };
        
        const result = await action(payload as any);
        if (result.success) {
            toast({ title: `Lesson ${lessonDialogState.initialData ? 'Updated' : 'Added'}` });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setLessonDialogState({ isOpen: false });
    }
    
    const handleDeleteLesson = async () => {
        if (!activeSubject || !activeUnit || !deletingLesson) return;
        const result = await deleteLesson({ courseId: course.id, subjectId: activeSubject.id, unitId: activeUnit.id, lessonId: deletingLesson.id });
        if (result.success) {
            toast({ title: "Lesson Deleted" });
            onContentUpdated();
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
        setDeletingLesson(null);
    }

    // When a subject is selected, update the active subject from the *latest* course data
    useEffect(() => {
        if (activeSubject) {
            const updatedCourse = course.subjects.find(s => s.id === activeSubject.id);
            setActiveSubject(updatedCourse || null);
        }
    }, [course, activeSubject]);
    
     useEffect(() => {
        if (activeUnit) {
            const updatedSubject = course.subjects.find(s => s.id === activeSubject?.id);
            const updatedUnit = updatedSubject?.units.find(u => u.id === activeUnit.id);
            setActiveUnit(updatedUnit || null);
        }
    }, [course, activeSubject, activeUnit]);


    return (
        <>
            <ConfirmDialog isOpen={!!deletingSubject} onClose={() => setDeletingSubject(null)} onConfirm={handleDeleteSubject} title="Delete Subject?" description={`Permanently delete "${deletingSubject?.name}". All units and lessons inside will also be deleted.`} />
            <ConfirmDialog isOpen={!!deletingUnit} onClose={() => setDeletingUnit(null)} onConfirm={handleDeleteUnit} title="Delete Unit?" description={`Permanently delete "${deletingUnit?.title}". All lessons inside will also be deleted.`} />
            <ConfirmDialog isOpen={!!deletingLesson} onClose={() => setDeletingLesson(null)} onConfirm={handleDeleteLesson} title="Delete Lesson?" description={`Permanently delete the lesson "${deletingLesson?.title}".`} />
            {lessonDialogState.isOpen && lessonDialogState.unit && (
                <ManageLessonDialog 
                    isOpen={lessonDialogState.isOpen}
                    onClose={() => setLessonDialogState({isOpen: false})}
                    onSave={handleSaveLesson}
                    initialData={lessonDialogState.initialData}
                    courseId={course.id}
                    subjectId={activeSubject?.id || ''}
                    unitId={lessonDialogState.unit.id}
                />
            )}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookCopy /> {course.name}</CardTitle>
                    <CardDescription>Manage the curriculum for the {course.name.toLowerCase()}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                        {/* Subjects Column */}
                        <div className="col-span-1 border-r pr-4">
                            <h4 className="font-semibold mb-2">Subjects</h4>
                            <div className="flex gap-2 mb-4">
                                <Input placeholder="New subject..." value={newSubject} onChange={(e) => setNewSubject(e.target.value)} disabled={isAddingSubject}/>
                                <Button onClick={handleAddSubject} disabled={isAddingSubject} size="sm">{isAddingSubject ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Add'}</Button>
                            </div>
                            <ScrollArea className="h-96">
                                <ul className="space-y-2">
                                     {course.subjects.map(subject => (
                                        <li key={subject.id} className={`p-2 rounded-md cursor-pointer ${activeSubject?.id === subject.id ? 'bg-primary/10' : 'hover:bg-secondary'}`} onClick={() => setActiveSubject(subject)}>
                                           {editingSubject?.id === subject.id ? (
                                                <div className="flex items-center gap-2">
                                                    <Input value={editingSubjectValue} onChange={(e) => setEditingSubjectValue(e.target.value)} className="h-8" />
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleUpdateSubject}><Save className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingSubject(null)}><XCircle className="h-4 w-4" /></Button>
                                                </div>
                                           ) : (
                                            <div className="flex items-center justify-between group">
                                                <span className="font-medium">{subject.name}</span>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingSubject(subject); setEditingSubjectValue(subject.name); }}><Pencil className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingSubject(subject);}}><Trash className="h-4 w-4" /></Button>
                                                    <ChevronRight className="h-5 w-5 inline-block text-muted-foreground" />
                                                </div>
                                            </div>
                                           )}
                                        </li>
                                     ))}
                                </ul>
                            </ScrollArea>
                        </div>

                        {/* Units Column */}
                        <div className="col-span-1 border-r pr-4">
                            <h4 className="font-semibold mb-2">Units {activeSubject ? `in ${activeSubject.name}` : ''}</h4>
                            {activeSubject ? (
                                <>
                                    <div className="flex gap-2 mb-4">
                                        <Input placeholder="New unit..." value={newUnit} onChange={e => setNewUnit(e.target.value)} disabled={isAddingUnit} />
                                        <Button onClick={handleAddUnit} disabled={isAddingUnit} size="sm">{isAddingUnit ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Add'}</Button>
                                    </div>
                                    <ScrollArea className="h-96">
                                        <Accordion type="single" collapsible className="w-full" onValueChange={unitId => setActiveUnit(activeSubject.units.find(u => u.id === unitId) || null)}>
                                            {activeSubject.units.map(unit => (
                                                <AccordionItem value={unit.id} key={unit.id}>
                                                    <AccordionTrigger className="hover:no-underline">
                                                        {editingUnit?.id === unit.id ? (
                                                             <div className="flex w-full items-center gap-2 pr-6">
                                                                <Input value={editingUnitValue} onChange={(e) => setEditingUnitValue(e.target.value)} className="h-8" />
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={(e) => {e.stopPropagation(); handleUpdateUnit();}}><Save className="h-4 w-4" /></Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={(e) => {e.stopPropagation(); setEditingUnit(null);}}><XCircle className="h-4 w-4" /></Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex w-full items-center justify-between group">
                                                                <span className="font-medium">{unit.title}</span>
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingUnit(unit); setEditingUnitValue(unit.title);}}><Pencil className="h-4 w-4" /></Button>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingUnit(unit);}}><Trash className="h-4 w-4" /></Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <span className="text-xs text-muted-foreground">This unit has {unit.lessons.length} lesson(s). Select to view them.</span>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </ScrollArea>
                                </>
                            ) : <div className="text-center text-muted-foreground pt-16">Select a subject to see its units.</div>}
                        </div>

                        {/* Lessons Column */}
                        <div className="col-span-1">
                             <h4 className="font-semibold mb-2">Lessons {activeUnit ? `in ${activeUnit.title}` : ''}</h4>
                             {activeUnit ? (
                                <>
                                    <Button className="w-full mb-4" onClick={() => setLessonDialogState({ isOpen: true, unit: activeUnit })}>
                                        <FileVideo className="mr-2" /> Add New Lesson
                                    </Button>
                                    <ScrollArea className="h-96">
                                        <ul className="space-y-2">
                                            {activeUnit.lessons.map(lesson => (
                                                <li key={lesson.id} className="p-2 rounded-md bg-secondary/50 flex items-center justify-between group">
                                                    <div className="flex items-center gap-2">
                                                        <Video className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">{lesson.title}</span>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setLessonDialogState({ isOpen: true, initialData: lesson, unit: activeUnit })}><Pencil className="h-4 w-4" /></Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeletingLesson(lesson)}><Trash className="h-4 w-4" /></Button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </>
                             ) : <div className="text-center text-muted-foreground pt-16">Select a unit to see its lessons.</div>}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
};


export default function AdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  
  // State for the new edit form
  const [searchIitpNo, setSearchIitpNo] = useState('');
  const [isFetchingParticipant, setIsFetchingParticipant] = useState(false);
  const [fetchedParticipant, setFetchedParticipant] = useState<Participant | null>(null);
  const [editFormData, setEditFormData] = useState<Omit<Participant, 'createdAt'>>({ id: '', name: '', iitpNo: '', mobile: '', organization: '', enrolledCourses: []});


  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isAddParticipantOpen, setAddParticipantOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  
  // Trainer states
  const [isAddTrainerOpen, setAddTrainerOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [deletingTrainerId, setDeletingTrainerId] = useState<string | null>(null);


  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    const [fetchedBatches, fetchedParticipants, fetchedTrainers, fetchedCourses] = await Promise.all([
      getBatches(),
      getParticipants(),
      getTrainers(),
      getCourses()
    ]);
    setBatches(fetchedBatches);
    setParticipants(fetchedParticipants);
    setTrainers(fetchedTrainers);
    setCourses(fetchedCourses);
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (isAuthenticated) {
        fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  useEffect(() => {
    if (fetchedParticipant) {
      setEditFormData({
        id: fetchedParticipant.id,
        name: fetchedParticipant.name,
        iitpNo: fetchedParticipant.iitpNo,
        mobile: fetchedParticipant.mobile || '',
        organization: fetchedParticipant.organization || '',
        enrolledCourses: fetchedParticipant.enrolledCourses || [],
      });
    } else {
       setEditFormData({ id: '', name: '', iitpNo: '', mobile: '', organization: '', enrolledCourses: []});
    }
  }, [fetchedParticipant]);


  const reportStats = useMemo(() => {
    // Participant-based stats
    let totalRegistrations = 0;
    let diplomaEnrollments = 0;
    let advanceDiplomaEnrollments = 0;
    const organizationSet = new Set<string>();

    participants.forEach(participant => {
      if (participant.organization) {
        organizationSet.add(participant.organization);
      }
      if (participant.enrolledCourses && participant.enrolledCourses.length > 0) {
        totalRegistrations += participant.enrolledCourses.length;
        participant.enrolledCourses.forEach(course => {
          const courseName = course.toLowerCase();
          if (courseName.includes('advance diploma')) {
            advanceDiplomaEnrollments++;
          } else if (courseName.includes('diploma') && !courseName.includes('advance diploma')) {
            diplomaEnrollments++;
          }
        });
      }
    });

    // Batch-based stats
    const totalSessions = batches.length;
    const diplomaSessions = batches.filter(b => b.course === 'Diploma').length;
    const advanceDiplomaSessions = batches.filter(b => b.course === 'Advance Diploma').length;

    return {
      totalRegistrations,
      diplomaEnrollments,
      advanceDiplomaEnrollments,
      totalSessions,
      diplomaSessions,
      advanceDiplomaSessions,
      totalOrganizations: organizationSet.size,
      totalTrainers: trainers.length,
    };
  }, [participants, batches, trainers]);
  
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Bsa@123') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
  };

  const handleDeleteBatch = (batch: Batch) => {
    setDeletingBatch(batch);
  };
  
  const handleSaveBatch = async (details: { name: string; course: 'Diploma' | 'Advance Diploma' | 'Other'; startDate?: Date; startTime: string; endTime: string; trainerId: string; }) => {
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

  const handleCreateBatch = async (details: { name: string; course: 'Diploma' | 'Advance Diploma' | 'Other'; startDate?: Date; startTime: string; endTime: string; trainerId: string; }) => {
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
    } else {
        toast({
            variant: "destructive",
            title: "Error Creating Batch",
            description: result.error || "Could not create the new batch.",
        });
    }
    setCreateDialogOpen(false);
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

  const handleAddParticipant = async (details: Omit<Participant, 'id' | 'createdAt'>) => {
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
    
    const result = await updateParticipant({
      ...editFormData,
      enrolledCourses: Array.isArray(editFormData.enrolledCourses) ? editFormData.enrolledCourses : String(editFormData.enrolledCourses).split(',').map(c => c.trim()).filter(Boolean)
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

  const handleImportSave = async (importedParticipants: Omit<Participant, 'id'|'createdAt'>[]) => {
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
    } else {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: result.error || 'An unexpected error occurred during the bulk import.',
      });
    }

    setImportDialogOpen(false);
  };
  
  // Trainer Handlers
  const handleSaveTrainer = async (details: { name: string, meetingLink: string }) => {
    const action = editingTrainer ? updateTrainer : addTrainer;
    const payload = editingTrainer ? { ...details, id: editingTrainer.id } : details;

    const result = await action(payload as any); // Cast needed due to overload

    if (result.success) {
      toast({
        title: `Trainer ${editingTrainer ? 'Updated' : 'Added'}`,
        description: `${details.name} has been saved successfully.`,
      });
      fetchAllData();
    } else {
      toast({
        variant: 'destructive',
        title: `Error ${editingTrainer ? 'Updating' : 'Adding'} Trainer`,
        description: result.error || `Could not save the trainer.`,
      });
    }
    setEditingTrainer(null);
    setAddTrainerOpen(false);
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

  if (!isClient) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Please enter the password to view this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
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
        />
      )}
       <AddParticipantDialog 
        isOpen={isAddParticipantOpen}
        onClose={() => setAddParticipantOpen(false)}
        onSave={handleAddParticipant}
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


      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <div className="flex flex-col">
              <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
                  Admin Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                  Manage training batches, registrations, and participants.
              </p>
          </div>
          <Link href="/" passHref>
              <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="trainings">Trainings</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="trainers">Trainers</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>A high-level overview of your training statistics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-primary">Students</h3>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <Card className="p-4">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-primary" />
                          <p className="text-2xl font-bold">{reportStats.totalRegistrations}</p>
                          <p className="text-sm text-muted-foreground">Total Enrollments</p>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex flex-col items-center gap-2">
                          <BookUser className="h-8 w-8 text-primary" />
                          <p className="text-2xl font-bold">{reportStats.diplomaEnrollments}</p>
                          <p className="text-sm text-muted-foreground">Diploma Enrollments</p>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex flex-col items-center gap-2">
                          <BookUp className="h-8 w-8 text-primary" />
                          <p className="text-2xl font-bold">{reportStats.advanceDiplomaEnrollments}</p>
                          <p className="text-sm text-muted-foreground">Adv. Diploma Enrollments</p>
                        </div>
                      </Card>
                  </div>
                </div>

                 <div>
                  <h3 className="text-lg font-medium text-primary">Training Sessions</h3>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <Card className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <Presentation className="h-8 w-8 text-primary" />
                        <p className="text-2xl font-bold">{reportStats.totalSessions}</p>
                        <p className="text-sm text-muted-foreground">Total Sessions</p>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <School className="h-8 w-8 text-primary" />
                        <p className="text-2xl font-bold">{reportStats.diplomaSessions}</p>
                        <p className="text-sm text-muted-foreground">Diploma Sessions</p>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <BookUp className="h-8 w-8 text-primary" />
                        <p className="text-2xl font-bold">{reportStats.advanceDiplomaSessions}</p>
                        <p className="text-sm text-muted-foreground">Adv. Diploma Sessions</p>
                      </div>
                    </Card>
                  </div>
                </div>
                
                 <div>
                  <h3 className="text-lg font-medium text-primary">Other</h3>
                  <Separator className="my-2" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <Card className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <Building className="h-8 w-8 text-primary" />
                        <p className="text-2xl font-bold">{reportStats.totalOrganizations}</p>
                        <p className="text-sm text-muted-foreground">Total Organizations</p>
                      </div>
                    </Card>
                    <Card className="p-4">
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
          
          <TabsContent value="trainings" className="mt-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Training Batches</CardTitle>
                    <CardDescription>View and manage all training batches and their registrations.</CardDescription>
                  </div>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create New Batch
                  </Button>
                </CardHeader>
                <CardContent>
                  {batches && batches.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {batches.map(batch => (
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
                      <p>Click "Create New Batch" to get started.</p>
                    </div>
                  )}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
             {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="directory">Directory</TabsTrigger>
                    <TabsTrigger value="add">Add / Import</TabsTrigger>
                    <TabsTrigger value="update">Update User</TabsTrigger>
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
                          <CardDescription>Fetch a user by their IITP No. to edit their details.</CardDescription>
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
                              <div className="border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            <SelectItem key={org} value={org}>
                                              {org}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2 col-span-1 md:col-span-2">
                                      <Label htmlFor="edit-courses">Enrolled Courses (comma-separated)</Label>
                                      <Textarea 
                                        id="edit-courses"
                                        value={Array.isArray(editFormData.enrolledCourses) ? editFormData.enrolledCourses.join(', ') : editFormData.enrolledCourses}
                                        onChange={e => setEditFormData({...editFormData, enrolledCourses: e.target.value.split(',').map(c => c.trim())})}
                                        placeholder="Course A, Course B, ..."
                                      />
                                  </div>
                                  <div className="col-span-1 md:col-span-2 flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => {setFetchedParticipant(null); setSearchIitpNo('');}}>Cancel</Button>
                                    <Button onClick={handleUpdateParticipant}>Update Details</Button>
                                  </div>
                              </div>
                          )}
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

          <TabsContent value="attendance" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Report</CardTitle>
                    <CardDescription>View and export participant attendance for Diploma and Advance Diploma courses.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AttendanceReport 
                        participants={participants}
                        batches={batches}
                    />
                </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </>
  );
}
