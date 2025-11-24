

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Batch, Participant, Trainer, Course, Subject, Unit, Lesson, SuperAdmin, Organization, OrganizationAdmin, Exam, Question, Registration, FormAdmin } from '@/lib/types';
import { RegistrationsTable } from '@/components/features/registrations-table';
import { EditBatchDialog } from '@/components/features/edit-batch-name-dialog';
import { DeleteBatchDialog } from '@/components/features/delete-batch-dialog';
import { ConfirmDialog } from '@/components/features/confirm-dialog';
import { AttendanceReport } from '@/components/features/attendance-report';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, Download, Users, BookUser, BookUp, Presentation, School, Building, Loader2, CalendarCheck, BookCopy, Save, XCircle, ChevronRight, FolderPlus, FileVideo, Video, Clock, Ban, RotateCcw, Calendar as CalendarIcon, FileQuestion, Settings, Book, Image as ImageIcon, UserCog, Circle, CircleDot, CircleSlash, GraduationCap } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addCourse, updateBatch, getBatches, createBatch, deleteBatch, getParticipants, getTrainers, getCourses, updateCourseName, addSubject, updateSubject, deleteSubject, addUnit, updateUnit, deleteUnit, addLesson, updateLesson, deleteLesson, updateCourseStatus, deleteCourse, getSiteConfig, updateSiteConfig, cancelBatch, unCancelBatch } from '@/app/actions';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isWithinInterval } from 'date-fns';
import { AdvancedAttendanceExport } from '@/components/features/advanced-attendance-export';
import { CancelBatchDialog } from '@/components/features/cancel-batch-dialog';


export default function AdminPage() {
  const router = useRouter();
  // Data states
  const [batches, setBatches] = useState<Batch[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  // Auth states
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'superadmin' | 'trainer' | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  
  // Dialog states
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [cancellingBatch, setCancellingBatch] = useState<Batch | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isAddCourseOpen, setAddCourseOpen] = useState(false);

  // Form & Filter states
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseStatus, setNewCourseStatus] = useState<'active' | 'coming-soon' | 'deactivated'>('active');
  const [scheduleDateRange, setScheduleDateRange] = useState<{from?: Date, to?: Date}>({});
  const [announcement, setAnnouncement] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);


  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    const [fetchedBatches, fetchedParticipants, fetchedTrainers, fetchedCourses, siteConfig] = await Promise.all([
      getBatches(), 
      getParticipants(), 
      getTrainers(), 
      getCourses(),
      getSiteConfig()
    ]);

    setBatches(fetchedBatches);
    setParticipants(fetchedParticipants);
    setTrainers(fetchedTrainers);
    setCourses(fetchedCourses);
    setAnnouncement(siteConfig.announcement);
    setHeroImageUrl(siteConfig.heroImageUrl);
  }, []);
  
  useEffect(() => {
    setIsClient(true);
    // Check session storage for auth state
    const role = sessionStorage.getItem('userRole') as 'superadmin' | 'trainer' | null;
    const id = sessionStorage.getItem('trainerId');
    
    if(role) {
        setIsAuthenticated(true);
        setUserRole(role);
        if(role === 'trainer' && id) {
            setTrainerId(id);
        }
        fetchAllData();
    } else {
        router.push('/login');
    }
  }, [fetchAllData, router]);


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
        if (dateA !== dateB) return dateB - dateA;
        
        // If dates are same, sort by start time
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeB.localeCompare(timeA);
    });
  }, [filteredBatches]);

  const reportStats = useMemo(() => {
    let totalEnrollments = 0;
    const courseStats: { [courseName: string]: { enrollments: number; sessions: number; } } = {};
    const organizationStats: { [orgName: string]: number } = {};
    const yearStats: { [year: string]: number } = {};

    courses.forEach(course => {
      courseStats[course.name] = { enrollments: 0, sessions: 0 };
    });
    
    participants.forEach(participant => {
      // Organization stats
      const org = participant.organization || 'Unspecified';
      organizationStats[org] = (organizationStats[org] || 0) + 1;

      // Year stats
      if (participant.year) {
        yearStats[participant.year] = (yearStats[participant.year] || 0) + 1;
      }

      // Course enrollment stats
      participant.enrolledCourses?.forEach(enrolledCourse => {
        if (courseStats[enrolledCourse]) {
          courseStats[enrolledCourse].enrollments += 1;
          totalEnrollments++;
        }
      });
    });

    batches.forEach(batch => {
      if (courseStats[batch.course]) {
          courseStats[batch.course].sessions += 1;
      }
    });

    return {
      totalParticipants: participants.length,
      totalEnrollments,
      totalSessions: batches.length,
      totalOrganizations: Object.keys(organizationStats).length,
      totalTrainers: trainers.length,
      courseStats,
      organizationStats,
      yearStats
    };
  }, [participants, batches, trainers, courses]);
  
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
  
  const handleConfirmCancelBatch = async (reason: string) => {
    if (!cancellingBatch) return;
    const result = await cancelBatch({ batchId: cancellingBatch.id, reason });
    if(result.success) {
        toast({ title: "Batch Cancelled" });
        fetchAllData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setCancellingBatch(null);
  }

  const handleUnCancelBatch = async (batchId: string) => {
    const result = await unCancelBatch(batchId);
    if(result.success) {
        toast({ title: "Batch Restored" });
        fetchAllData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  }

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
  
    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        const result = await updateSiteConfig({ announcement, heroImageUrl });
        if(result.success) {
            toast({ title: 'Settings Updated' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setIsSavingSettings(false);
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

        const filtered = sortedScheduleBatches.filter(batch => {
            if (!batch.startDate) return false;
            const batchDate = new Date(batch.startDate);
            return isWithinInterval(batchDate, { start: from, end: to });
        });

        if (filtered.length === 0) {
            toast({
                title: 'No Data',
                description: 'No batches found within the selected date range.',
            });
            return;
        }
        
        const headers = "Date,Start Time,End Time,Batch Name,Course,Trainer,Registrations,Status\n";
        const csvRows = filtered.map(batch => {
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

  const downloadCsv = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ variant: 'destructive', title: 'No data to export' });
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = String(row[header] ?? '');
          return `"${value.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}.csv`);
    a.click();
    toast({ title: 'Export Complete', description: `${filename}.csv has been downloaded.` });
  };

  const handleExportParticipants = () => {
    const dataToExport = participants.map(p => ({
      id: p.id,
      name: p.name,
      iitpNo: p.iitpNo,
      mobile: p.mobile,
      organization: p.organization,
      createdAt: p.createdAt,
      enrolledCourses: p.enrolledCourses?.join('; ') || '',
      completedLessons: p.completedLessons?.join('; ') || '',
      deniedCourses: p.deniedCourses?.join('; ') || ''
    }));
    downloadCsv(dataToExport, 'all_participants');
  };

  const handleExportTrainings = () => {
    const dataToExport: any[] = [];
    batches.forEach(batch => {
      batch.registrations.forEach(reg => {
        dataToExport.push({
          batchId: batch.id,
          batchName: batch.name,
          course: batch.course,
          batchStartDate: batch.startDate,
          batchStartTime: batch.startTime,
          batchEndTime: batch.endTime,
          trainerId: batch.trainerId,
          trainerName: trainers.find(t => t.id === batch.trainerId)?.name || '',
          isCancelled: batch.isCancelled,
          registrationId: reg.id,
          participantName: reg.name,
          participantIitpNo: reg.iitpNo,
          participantMobile: reg.mobile,
          participantOrganization: reg.organization,
          registrationTime: reg.submissionTime
        });
      });
    });
    downloadCsv(dataToExport, 'all_trainings_with_registrations');
  };

  const handleExportCourses = () => {
    const dataToExport: any[] = [];
    courses.forEach(course => {
      course.subjects.forEach(subject => {
        subject.units.forEach(unit => {
          unit.lessons.forEach(lesson => {
            dataToExport.push({
              courseId: course.id,
              courseName: course.name,
              courseStatus: course.status,
              subjectId: subject.id,
              subjectName: subject.name,
              unitId: unit.id,
              unitTitle: unit.title,
              lessonId: lesson.id,
              lessonTitle: lesson.title,
              lessonDuration: lesson.duration,
              lessonVideoUrl: lesson.videoUrl,
            });
          });
        });
      });
    });
    downloadCsv(dataToExport, 'all_course_structures');
  };

  if (!isClient) {
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

  const SuperAdminTabs = () => (
     <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="trainings">Trainings</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div>
                                <CardTitle>Reports</CardTitle>
                                <CardDescription>A high-level overview of your training statistics.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                    <Users className="h-8 w-8 text-primary" />
                                    <p className="text-2xl font-bold">{reportStats.totalParticipants}</p>
                                    <p className="text-sm text-muted-foreground">Total Participants</p>
                                    </div>
                                </Card>
                                    <Card className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Presentation className="h-8 w-8 text-primary" />
                                        <p className="text-2xl font-bold">{reportStats.totalSessions}</p>
                                        <p className="text-sm text-muted-foreground">Total Sessions Conducted</p>
                                    </div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Building className="h-8 w-8 text-primary" />
                                        <p className="text-2xl font-bold">{reportStats.totalOrganizations}</p>
                                        <p className="text-sm text-muted-foreground">Unique Organizations</p>
                                    </div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <UserCog className="h-8 w-8 text-primary" />
                                        <p className="text-2xl font-bold">{reportStats.totalTrainers}</p>
                                        <p className="text-sm text-muted-foreground">Registered Trainers</p>
                                    </div>
                                </Card>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1">
                                    <h3 className="text-lg font-medium mb-4">Admissions by Organization</h3>
                                    <div className="border rounded-lg max-h-72 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Organization</TableHead>
                                                    <TableHead className="text-right">Participants</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {Object.entries(reportStats.organizationStats).length > 0 ? (
                                                Object.entries(reportStats.organizationStats).sort(([,a],[,b]) => b-a).map(([name, count]) => (
                                                    <TableRow key={name}>
                                                        <TableCell className="font-medium">{name}</TableCell>
                                                        <TableCell className="text-right">{count}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="h-24 text-center">No organization data.</TableCell>
                                                </TableRow>
                                            )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                                <div className="lg:col-span-1">
                                    <h3 className="text-lg font-medium mb-4">Admissions by Year</h3>
                                    <div className="border rounded-lg max-h-72 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Year</TableHead>
                                                    <TableHead className="text-right">Participants</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {Object.entries(reportStats.yearStats).length > 0 ? (
                                                Object.entries(reportStats.yearStats).sort((a,b) => b[0].localeCompare(a[0])).map(([name, count]) => (
                                                    <TableRow key={name}>
                                                        <TableCell className="font-medium">{name}</TableCell>
                                                        <TableCell className="text-right">{count}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="h-24 text-center">No year data.</TableCell>
                                                </TableRow>
                                            )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                                <div className="lg:col-span-1">
                                    <h3 className="text-lg font-medium mb-4">Course Statistics</h3>
                                    <div className="border rounded-lg max-h-72 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Course</TableHead>
                                                    <TableHead>Enrollments</TableHead>
                                                    <TableHead>Sessions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {Object.entries(reportStats.courseStats).length > 0 ? (
                                                Object.entries(reportStats.courseStats).map(([name, stats]) => (
                                                    <TableRow key={name}>
                                                        <TableCell className="font-medium">{name}</TableCell>
                                                        <TableCell>{stats.enrollments}</TableCell>
                                                        <TableCell>{stats.sessions}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center">No course data.</TableCell>
                                                </TableRow>
                                            )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Data Exports</CardTitle>
                            <CardDescription>Download your core application data as CSV files for use in Looker Studio or other tools.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button variant="outline" onClick={handleExportParticipants}>
                                <Users className="mr-2"/> Export Participants
                            </Button>
                            <Button variant="outline" onClick={handleExportTrainings}>
                                <Presentation className="mr-2"/> Export Trainings
                            </Button>
                            <Button variant="outline" onClick={handleExportCourses}>
                                <BookCopy className="mr-2"/> Export Courses
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>Manage participants, trainers, and admins.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full">
                                <Link href="/admin/users">
                                    <Users className="mr-2 h-4 w-4" /> Manage Users
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Content Management</CardTitle>
                            <CardDescription>Manage courses, subjects, lessons, and exams.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button asChild className="flex-1">
                                    <Link href="/admin/content">
                                        <Book className="mr-2 h-4 w-4" /> Manage Courses
                                    </Link>
                                </Button>
                                 <Button asChild className="flex-1">
                                    <Link href="/admin/exams">
                                        <GraduationCap className="mr-2 h-4 w-4" /> Manage Exams
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
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
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditBatch(batch)} disabled={batch.isCancelled}>
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
                                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteBatch(batch)}>
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
            </TabsContent>
            <TabsContent value="attendance" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Attendance Report</CardTitle>
                        <CardDescription>View and export participant attendance for specific courses, trainers, and date ranges.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <AdvancedAttendanceExport 
                            batches={filteredBatches}
                            trainers={trainers}
                            courses={courses}
                        />
                        <Separator />
                        <AttendanceReport 
                            participants={participants}
                            batches={filteredBatches}
                            courses={courses}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="settings" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Site Settings</CardTitle>
                        <CardDescription>Manage global settings for the training portal.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="announcement-text" className="flex items-center gap-2"><Settings className="h-4 w-4"/> Homepage Announcement</Label>
                            <Textarea 
                                id="announcement-text" 
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                placeholder="Enter a site-wide announcement..."
                                rows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="hero-image-url" className="flex items-center gap-2"><ImageIcon className="h-4 w-4"/> Homepage Hero Image URL</Label>
                            <Input 
                                id="hero-image-url" 
                                value={heroImageUrl}
                                onChange={(e) => setHeroImageUrl(e.target.value)}
                                placeholder="https://example.com/your-image.jpg"
                            />
                        </div>
                        <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                            {isSavingSettings ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Settings'}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
    </Tabs>
  );

  const TrainerTabs = () => (
    <Tabs defaultValue="trainings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trainings">My Trainings</TabsTrigger>
            <TabsTrigger value="exams" asChild><Link href="/admin/exams"><GraduationCap className="mr-2 h-4 w-4"/>Exams</Link></TabsTrigger>
            <TabsTrigger value="attendance">My Attendance</TabsTrigger>
        </TabsList>
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
                                                <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditBatch(batch)} disabled={batch.isCancelled}>
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
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteBatch(batch)}>
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
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Report</CardTitle>
                    <CardDescription>View and export participant attendance for specific courses, trainers, and date ranges.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                        <AdvancedAttendanceExport 
                        batches={filteredBatches}
                        trainers={trainers}
                        courses={courses}
                        />
                        <Separator />
                    <AttendanceReport 
                        participants={participants}
                        batches={filteredBatches}
                        courses={courses}
                    />
                </CardContent>
            </Card>
        </TabsContent>
    </Tabs>
  );


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
      <div className="w-full">
         {isClient && (userRole === 'superadmin' ? <SuperAdminTabs /> : <TrainerTabs />)}
      </div>
    </>
  );
}
