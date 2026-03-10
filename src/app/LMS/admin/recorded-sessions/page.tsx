
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChevronLeft, Video, PlusCircle, Loader2, Pencil, Trash, Calendar as CalendarIcon, BookOpen, Link as LinkIcon, Users, Download, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, formatDistance } from 'date-fns';
import type { RecordedSession, Course, Subject, Unit, Participant } from '@/lib/types';
import { getRecordedSessions, addRecordedSession, updateRecordedSession, deleteRecordedSession, getCourses, getParticipants } from '@/app/actions';
import { ConfirmDialog } from '@/components/features/confirm-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// The dialog component for editing/adding sessions
const ManageSessionDialog = ({
    isOpen,
    onClose,
    onSave,
    courses,
    initialData,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    courses: Course[];
    initialData?: RecordedSession | null;
}) => {
    const [title, setTitle] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [recordedDate, setRecordedDate] = useState<Date | undefined>();
    const [courseId, setCourseId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [unitId, setUnitId] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const subjectsForSelectedCourse = useMemo(() => {
        if (!courseId || courseId === '--none--') return [];
        const course = courses.find(c => c.id === courseId);
        return course?.subjects || [];
    }, [courseId, courses]);

    const unitsForSelectedSubject = useMemo(() => {
        if (!subjectId || subjectId === '--none--') return [];
        const subject = subjectsForSelectedCourse.find(s => s.id === subjectId);
        return subject?.units || [];
    }, [subjectId, subjectsForSelectedCourse]);

    useEffect(() => {
        if (isOpen) {
            setTitle(initialData?.title || '');
            setVideoUrl(initialData?.videoUrl || '');
            setRecordedDate(initialData?.recordedDate ? new Date(initialData.recordedDate) : new Date());
            setCourseId(initialData?.courseId || '');
            setSubjectId(initialData?.subjectId || '');
            setUnitId(initialData?.unitId || '');
            setDescription(initialData?.description || '');
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleCourseChange = (newCourseId: string) => {
        setCourseId(newCourseId);
        setSubjectId('');
        setUnitId('');
    };
    
    const handleSubjectChange = (newSubjectId: string) => {
        setSubjectId(newSubjectId);
        setUnitId('');
    };

    const handleSave = async () => {
        if (!title.trim() || !videoUrl.trim() || !recordedDate) {
            toast({ variant: 'destructive', title: 'Title, Video URL, and Recorded Date are required.' });
            return;
        }
        setIsSaving(true);
        const dataToSave = {
            title,
            videoUrl,
            recordedDate,
            courseId: (courseId && courseId !== '--none--') ? courseId : undefined,
            subjectId: (subjectId && subjectId !== '--none--') ? subjectId : undefined,
            unitId: (unitId && unitId !== '--none--') ? unitId : undefined,
            description
        };
        if(initialData) {
            await onSave({ ...dataToSave, id: initialData.id });
        } else {
            await onSave(dataToSave);
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Recorded Session' : 'Upload New Recording'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="session-title">Session Title *</Label>
                        <Input id="session-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="session-video-url">Video URL *</Label>
                        <Input id="session-video-url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="e.g., YouTube or Vimeo link" />
                    </div>
                    <div className="space-y-2">
                        <Label>Recorded Date *</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal",!recordedDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {recordedDate ? format(recordedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={recordedDate} onSelect={setRecordedDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="session-course">Associated Course (Optional)</Label>
                        <Select value={courseId} onValueChange={handleCourseChange}>
                            <SelectTrigger id="session-course"><SelectValue placeholder="Select a course" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="--none--">None</SelectItem>
                                {courses.map(course => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="session-subject">Associated Subject (Optional)</Label>
                        <Select value={subjectId} onValueChange={handleSubjectChange} disabled={!courseId || courseId === '--none--'}>
                            <SelectTrigger id="session-subject"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="--none--">None</SelectItem>
                                {subjectsForSelectedCourse.map(subject => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="session-unit">Associated Unit (Optional)</Label>
                        <Select value={unitId} onValueChange={setUnitId} disabled={!subjectId || subjectId === '--none--'}>
                            <SelectTrigger id="session-unit"><SelectValue placeholder="Select a unit" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="--none--">None</SelectItem>
                                {unitsForSelectedSubject.map(unit => <SelectItem key={unit.id} value={unit.id}>{unit.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="session-description">Description</Label>
                        <Textarea id="session-description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Session'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ViewAttendanceDialog = ({
    isOpen,
    onClose,
    session,
    viewers
}: {
    isOpen: boolean;
    onClose: () => void;
    session: RecordedSession | null;
    viewers: Participant[];
}) => {
    const { toast } = useToast();
    if (!session) return null;

    const handleExport = () => {
        const headers = "Name,IITP No,Organization,Started At,Completed At,Duration (Minutes)\n";
        const csvRows = viewers.map(v => {
            const progress = v.lessonProgress?.[session.id];
            const startedAt = progress?.startedAt ? format(new Date(progress.startedAt), 'Pp') : 'N/A';
            const completedAt = progress?.completedAt ? format(new Date(progress.completedAt), 'Pp') : 'N/A';
            let duration = 'N/A';
            if (progress?.startedAt && progress?.completedAt) {
                 duration = formatDistance(new Date(progress.completedAt), new Date(progress.startedAt));
            }

            return `"${v.name}","${v.iitpNo}","${v.organization || ''}","${startedAt}","${completedAt}","${duration}"`
        }).join('\n');
        const csv = headers + csvRows;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.title}_attendance.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Export Started', description: `Attendance for ${session.title} is downloading.`});
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Attendance for: {session.title}</DialogTitle>
                    <DialogDescription>{viewers.length} participant(s) have viewed this session.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-96">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>IITP No.</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Started At</TableHead>
                                <TableHead>Completed At</TableHead>
                                <TableHead>Duration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {viewers.length > 0 ? viewers.map(viewer => {
                                const progress = viewer.lessonProgress?.[session.id];
                                let duration = 'Incomplete';
                                if(progress?.startedAt && progress.completedAt) {
                                    duration = formatDistance(new Date(progress.completedAt), new Date(progress.startedAt), { addSuffix: false });
                                } else if (progress?.startedAt) {
                                    duration = 'In progress';
                                }

                                return (
                                    <TableRow key={viewer.id}>
                                        <TableCell>{viewer.name}</TableCell>
                                        <TableCell>{viewer.iitpNo}</TableCell>
                                        <TableCell>{viewer.organization || 'N/A'}</TableCell>
                                        <TableCell>{progress?.startedAt ? format(new Date(progress.startedAt), 'Pp') : 'N/A'}</TableCell>
                                        <TableCell>{progress?.completedAt ? format(new Date(progress.completedAt), 'Pp') : 'N/A'}</TableCell>
                                        <TableCell>{duration}</TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No views yet for this session.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handleExport} disabled={viewers.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Download CSV
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// The main page component
export default function RecordedSessionsPage() {
    const [sessions, setSessions] = useState<RecordedSession[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogState, setDialogState] = useState<{isOpen: boolean, session?: RecordedSession | null}>({isOpen: false});
    const [deletingSession, setDeletingSession] = useState<RecordedSession | null>(null);
    const [viewingAttendanceFor, setViewingAttendanceFor] = useState<RecordedSession | null>(null);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [fetchedSessions, fetchedCourses, fetchedParticipants] = await Promise.all([
            getRecordedSessions(),
            getCourses(),
            getParticipants(),
        ]);
        setSessions(fetchedSessions);
        setCourses(fetchedCourses);
        setParticipants(fetchedParticipants);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleSaveSession = async (data: any) => {
        const action = dialogState.session ? updateRecordedSession : addRecordedSession;
        const result = await action(data);

        if (result.success) {
            toast({ title: `Session ${dialogState.session ? 'Updated' : 'Added'}!` });
            fetchData();
            setDialogState({ isOpen: false });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    };
    
    const handleDeleteSession = async () => {
        if (!deletingSession) return;
        const result = await deleteRecordedSession(deletingSession.id);
        if (result.success) {
            toast({ title: 'Session Deleted' });
            fetchData();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setDeletingSession(null);
    };

    const handleCopyLink = (sessionId: string) => {
        const url = `${window.location.origin}/LMS/view-session/${sessionId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: "The shareable session link has been copied."});
    };
    
    const viewersForSelectedSession = useMemo(() => {
        if (!viewingAttendanceFor) return [];
        return participants.filter(p => !!p.lessonProgress?.[viewingAttendanceFor.id]?.completedAt);
    }, [viewingAttendanceFor, participants]);

    return (
    <>
        <ManageSessionDialog 
            isOpen={dialogState.isOpen}
            onClose={() => setDialogState({isOpen: false})}
            onSave={handleSaveSession}
            courses={courses}
            initialData={dialogState.session}
        />
        <ConfirmDialog
            isOpen={!!deletingSession}
            onClose={() => setDeletingSession(null)}
            onConfirm={handleDeleteSession}
            title="Delete Recorded Session?"
            description={`This will permanently delete the session "${deletingSession?.title}". This cannot be undone.`}
        />
        <ViewAttendanceDialog
            isOpen={!!viewingAttendanceFor}
            onClose={() => setViewingAttendanceFor(null)}
            session={viewingAttendanceFor}
            viewers={viewersForSelectedSession}
        />
        <div>
        <div className="mb-8">
            <Button asChild variant="outline">
            <Link href="/LMS/admin">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to LMS Dashboard
            </Link>
            </Button>
        </div>

        <div className="flex justify-between items-center mb-8">
            <div>
            <h1 className="text-3xl font-bold tracking-tight">Recorded Sessions</h1>
            <p className="mt-2 text-lg text-muted-foreground">
                Manage and upload recorded training sessions.
            </p>
            </div>
            <Button onClick={() => setDialogState({isOpen: true, session: null})}>
                <PlusCircle className="mr-2 h-4 w-4" /> Upload New Recording
            </Button>
        </div>
        
        {loading ? (
            <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
                <p>Loading sessions...</p>
            </div>
        ) : sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map(session => {
                    const course = courses.find(c => c.id === session.courseId);
                    const subject = course?.subjects.find(s => s.id === session.subjectId);
                    const unit = subject?.units.find(u => u.id === session.unitId);
                    const viewCount = participants.filter(p => !!p.lessonProgress?.[session.id]?.completedAt).length;

                    return (
                        <Card key={session.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{session.title}</CardTitle>
                                <CardDescription>Recorded on: {format(new Date(session.recordedDate), 'PPP')}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-2">
                                {course && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <BookOpen className="h-4 w-4 flex-shrink-0" />
                                        <span>
                                            {course.name}
                                            {subject && ` / ${subject.name}`}
                                            {unit && ` / ${unit.title}`}
                                        </span>
                                    </div>
                                )}
                                <p className="text-sm text-muted-foreground line-clamp-3">{session.description || 'No description provided.'}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <Button variant="ghost" size="sm" onClick={() => window.open(session.videoUrl, '_blank')}><Video className="mr-2 h-4 w-4" /> Watch</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setViewingAttendanceFor(session)}><Users className="mr-2 h-4 w-4" /> {viewCount} Views</Button>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(session.id)} title="Copy shareable link">
                                        <LinkIcon className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialogState({isOpen: true, session})}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingSession(session)}><Trash className="h-4 w-4" /></Button>
                                </div>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        ) : (
            <Card className="text-center py-16 text-muted-foreground border-2 border-dashed">
                <CardContent>
                    <h3 className="text-xl font-semibold">No Recorded Sessions Found</h3>
                    <p className="mt-2">Click "Upload New Recording" to get started.</p>
                </CardContent>
            </Card>
        )}
        </div>
    </>
  );
}
