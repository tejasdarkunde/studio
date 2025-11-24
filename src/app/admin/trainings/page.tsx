
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Batch, Trainer, Course } from '@/lib/types';
import { getBatches, getTrainers, getCourses, createBatch, updateBatch, deleteBatch, cancelBatch, unCancelBatch } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, Ban, RotateCcw, Loader2, Calendar as CalendarIcon, Download, ChevronLeft, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { RegistrationsTable } from '@/components/features/registrations-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { EditBatchDialog } from '@/components/features/edit-batch-name-dialog';
import { DeleteBatchDialog } from '@/components/features/delete-batch-dialog';
import { CancelBatchDialog } from '@/components/features/cancel-batch-dialog';
import Link from 'next/link';

export default function TrainingsPage() {
    const router = useRouter();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const [userRole, setUserRole] = useState<'superadmin' | 'trainer' | null>(null);
    const [trainerId, setTrainerId] = useState<string | null>(null);

    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
    const [cancellingBatch, setCancellingBatch] = useState<Batch | null>(null);
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [scheduleDateRange, setScheduleDateRange] = useState<{from?: Date, to?: Date}>({});

    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [fetchedBatches, fetchedTrainers, fetchedCourses] = await Promise.all([
            getBatches(),
            getTrainers(),
            getCourses(),
        ]);
        setBatches(fetchedBatches);
        setTrainers(fetchedTrainers);
        setCourses(fetchedCourses);
        setLoading(false);
    }, []);

    useEffect(() => {
        const role = sessionStorage.getItem('userRole') as 'superadmin' | 'trainer' | null;
        const id = sessionStorage.getItem('trainerId');
        if (role) {
            setUserRole(role);
            if (role === 'trainer' && id) {
                setTrainerId(id);
            }
            fetchData();
        } else {
            router.push('/login');
        }
    }, [fetchData, router]);

    const filteredBatches = useMemo(() => {
        if (userRole === 'trainer' && trainerId) {
            return batches.filter(batch => batch.trainerId === trainerId);
        }
        return batches;
    }, [batches, userRole, trainerId]);

    const sortedScheduleBatches = useMemo(() => {
        return [...filteredBatches].sort((a, b) => {
            const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
            if (dateA !== dateB) return dateB - dateA; // Most recent date first
            
            // If dates are the same, sort by start time
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB); // Earlier time first
        });
    }, [filteredBatches]);
    
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
        fetchData();
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
            fetchData();
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
            fetchData();
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error || "Could not delete the batch." });
        }
        setDeletingBatch(null);
    }
  
    const handleConfirmCancelBatch = async (reason: string) => {
        if (!cancellingBatch) return;
        const result = await cancelBatch({ batchId: cancellingBatch.id, reason });
        if(result.success) {
            toast({ title: "Batch Cancelled" });
            fetchData();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setCancellingBatch(null);
    }

    const handleUnCancelBatch = async (batchId: string) => {
        const result = await unCancelBatch(batchId);
        if(result.success) {
            toast({ title: "Batch Restored" });
            fetchData();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
    }
    
    const formatTime = (timeString: string) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    
    const handleExportSchedule = () => {
        const { from, to } = scheduleDateRange;
        if (!from || !to) {
            toast({
                variant: 'destructive',
                title: 'Date Range Required',
                description: 'Please select a "from" and "to" date to export the schedule.',
            });
            return;
        }

        const filteredForExport = sortedScheduleBatches.filter(batch => {
            if (!batch.startDate) return false;
            const batchDate = new Date(batch.startDate);
            return isWithinInterval(batchDate, { start: from, end: to });
        });

        if (filteredForExport.length === 0) {
            toast({
                title: 'No Data',
                description: 'No batches found within the selected date range.',
            });
            return;
        }
        
        const headers = "Date,Start Time,End Time,Batch Name,Course,Trainer,Registrations,Status\n";
        const csvRows = filteredForExport.map(batch => {
            const trainerName = trainers.find(t => t.id === batch.trainerId)?.name || 'N/A';
            const status = batch.isCancelled ? `Cancelled (${batch.cancellationReason || 'No reason'})` : 'Active';
            const row = [
                batch.startDate ? format(new Date(batch.startDate), 'yyyy-MM-dd') : 'N/A',
                formatTime(batch.startTime),
                formatTime(batch.endTime),
                batch.name,
                batch.course,
                trainerName,
                batch.registrations?.length || 0,
                status,
            ];
             return row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',');
        }).join('\n');
        
        const csvContent = headers + csvRows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const fileName = `schedule_report_${format(from, 'yyyy-MM-dd')}_to_${format(to, 'yyyy-MM-dd')}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: 'Export Started',
            description: 'The schedule report is being downloaded.',
        });
    }

    const handleCopyLink = (batchId: string) => {
        const url = `${window.location.origin}/register/${batchId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: "Registration link copied to clipboard." });
    };

    if(loading) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        )
    }

    return (
        <>
        <CancelBatchDialog 
            isOpen={!!cancellingBatch}
            onClose={() => setCancellingBatch(null)}
            onConfirm={handleConfirmCancelBatch}
            batchName={cancellingBatch?.name || ''}
        />
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
        <main>
             <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
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
                <Tabs defaultValue="batch-view">
                    <TabsList>
                        <TabsTrigger value="batch-view">Batch View</TabsTrigger>
                        <TabsTrigger value="schedule-view">Schedule View</TabsTrigger>
                    </TabsList>
                    <TabsContent value="batch-view" className="mt-4">
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
                                                <Badge variant={batch.course === 'Diploma' ? 'default' : batch.course === 'Advance Diploma' ? 'secondary' : 'outline'} className="whitespace-normal text-center max-w-[200px]">
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
                                                    onClick={() => setEditingBatch(batch)}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit Batch
                                                </Button>
                                                <Button 
                                                    variant="destructive" 
                                                    size="sm"
                                                    onClick={() => setDeletingBatch(batch)}
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
                    </TabsContent>
                    <TabsContent value="schedule-view" className="mt-4">
                        <div className='flex justify-end items-center gap-2 mb-4'>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !scheduleDateRange.from && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {scheduleDateRange.from ? format(scheduleDateRange.from, "PPP") : <span>From date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={scheduleDateRange.from}
                                    onSelect={(date) => setScheduleDateRange(prev => ({ ...prev, from: date }))}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !scheduleDateRange.to && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {scheduleDateRange.to ? format(scheduleDateRange.to, "PPP") : <span>To date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={scheduleDateRange.to}
                                    onSelect={(date) => setScheduleDateRange(prev => ({ ...prev, to: date }))}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button onClick={handleExportSchedule} disabled={!scheduleDateRange.from || !scheduleDateRange.to}>
                                <Download className='mr-2 h-4 w-4'/> Export Schedule
                            </Button>
                        </div>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Batch Name</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead>Trainer</TableHead>
                                        <TableHead>Registrations</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedScheduleBatches.map(batch => {
                                        const trainer = trainers.find(t => t.id === batch.trainerId);
                                        return (
                                            <TableRow key={batch.id} className={cn(batch.isCancelled && "bg-destructive/10 text-muted-foreground")}>
                                                <TableCell>
                                                    <div className={cn("font-medium", batch.isCancelled && "line-through")}>{batch.startDate ? new Date(batch.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'}</div>
                                                    <div className={cn("text-sm", batch.isCancelled ? "line-through" : "text-muted-foreground")}>{formatTime(batch.startTime)} - {formatTime(batch.endTime)}</div>
                                                </TableCell>
                                                <TableCell className={cn(batch.isCancelled && "line-through")}>
                                                    {batch.name}
                                                    {batch.isCancelled && <Badge variant="destructive" className="ml-2">Cancelled</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={batch.course === 'Diploma' ? 'default' : batch.course === 'Advance Diploma' ? 'secondary' : 'outline'} className={cn(batch.isCancelled && "opacity-50")}>{batch.course}</Badge>
                                                </TableCell>
                                                <TableCell className={cn(batch.isCancelled && "line-through")}>{trainer?.name || 'N/A'}</TableCell>
                                                <TableCell>{batch.registrations?.length || 0}</TableCell>
                                                <TableCell className="text-right space-x-0">
                                                    <Button variant="ghost" size="icon" onClick={() => handleCopyLink(batch.id)} title="Copy direct link">
                                                        <LinkIcon className="h-4 w-4"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setEditingBatch(batch)} disabled={batch.isCancelled}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    {batch.isCancelled ? (
                                                        <Button variant="ghost" size="icon" onClick={() => handleUnCancelBatch(batch.id)}>
                                                            <RotateCcw className="h-4 w-4 text-green-600" />
                                                        </Button>
                                                    ) : (
                                                        <Button variant="ghost" size="icon" onClick={() => setCancellingBatch(batch)}>
                                                            <Ban className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingBatch(batch)}>
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            {sortedScheduleBatches.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>No batches found to display in the schedule.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
                </CardContent>
            </Card>
        </main>
        </>
    );
}

