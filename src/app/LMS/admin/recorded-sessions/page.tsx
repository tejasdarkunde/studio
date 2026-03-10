
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChevronLeft, Video, PlusCircle, Loader2, Pencil, Trash, Calendar as CalendarIcon, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { RecordedSession, Course } from '@/lib/types';
import { getRecordedSessions, addRecordedSession, updateRecordedSession, deleteRecordedSession, getCourses } from '@/app/actions';
import { ConfirmDialog } from '@/components/features/confirm-dialog';

// The dialog component
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
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setTitle(initialData?.title || '');
            setVideoUrl(initialData?.videoUrl || '');
            setRecordedDate(initialData?.recordedDate ? new Date(initialData.recordedDate) : new Date());
            setCourseId(initialData?.courseId || '');
            setDescription(initialData?.description || '');
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

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
                        <Select value={courseId} onValueChange={setCourseId}>
                            <SelectTrigger id="session-course"><SelectValue placeholder="Select a course" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="--none--">None</SelectItem>
                                {courses.map(course => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
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

// The main page component
export default function RecordedSessionsPage() {
    const [sessions, setSessions] = useState<RecordedSession[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogState, setDialogState] = useState<{isOpen: boolean, session?: RecordedSession | null}>({isOpen: false});
    const [deletingSession, setDeletingSession] = useState<RecordedSession | null>(null);
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [fetchedSessions, fetchedCourses] = await Promise.all([
            getRecordedSessions(),
            getCourses(),
        ]);
        setSessions(fetchedSessions);
        setCourses(fetchedCourses);
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
                    return (
                        <Card key={session.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{session.title}</CardTitle>
                                <CardDescription>Recorded on: {format(new Date(session.recordedDate), 'PPP')}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-2">
                                {course && <div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" /><span>{course.name}</span></div>}
                                <p className="text-sm text-muted-foreground line-clamp-3">{session.description || 'No description provided.'}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="ghost" size="sm" onClick={() => window.open(session.videoUrl, '_blank')}><Video className="mr-2 h-4 w-4" /> Watch</Button>
                                <div className="flex gap-1">
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
