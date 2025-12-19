

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Batch, Participant, Trainer, Course, Subject, Unit, Lesson, SuperAdmin, Organization, OrganizationAdmin, Exam, Question, Registration, FormAdmin } from '@/lib/types';
import { RegistrationsTable } from '@/components/features/registrations-table';
import { EditBatchDialog } from '@/components/features/edit-batch-name-dialog';
import { DeleteBatchDialog } from '@/components/features/delete-batch-dialog';
import { AttendanceReport } from '@/components/features/attendance-report';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, Download, Users, BookUser, BookUp, Presentation, School, Building, Loader2, CalendarCheck, BookCopy, Save, XCircle, ChevronRight, FolderPlus, FileVideo, Video, Clock, Ban, RotateCcw, Calendar as CalendarIcon, FileQuestion, Settings, Book, Image as ImageIcon, UserCog, Circle, CircleDot, CircleSlash, GraduationCap, FileText } from 'lucide-react';
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
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-6">
                <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                <CardTitle>Training Management</CardTitle>
                                <CardDescription>View and manage all training batches.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild className="w-full">
                                    <Link href="/admin/trainings">
                                        <Presentation className="mr-2 h-4 w-4" /> Manage Trainings
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
                        <Card>
                            <CardHeader>
                                <CardTitle>Form Management</CardTitle>
                                <CardDescription>Manage forms created by form admins.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild className="w-full" variant="secondary">
                                    <Link href="#">
                                        <FileText className="mr-2 h-4 w-4" /> Manage Forms
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Attendance</CardTitle>
                                <CardDescription>View and export attendance reports.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild className="w-full">
                                    <Link href="/admin/attendance">
                                        <CalendarCheck className="mr-2 h-4 w-4" /> View Attendance
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                     <Card className="col-span-1 md:col-span-2">
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div>
                                <CardTitle>Reports</CardTitle>
                                <CardDescription>A high-level overview of your training statistics.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                    <h3 className="text-lg font-medium mb-4">Course-wise Enrollments</h3>
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
                     <Card className="mt-6 col-span-2">
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
            <TabsTrigger value="trainings" asChild><Link href="/admin/trainings"><Presentation className="mr-2 h-4 w-4" /> My Trainings</Link></TabsTrigger>
            <TabsTrigger value="exams" asChild><Link href="/admin/exams"><GraduationCap className="mr-2 h-4 w-4"/>Exams</Link></TabsTrigger>
            <TabsTrigger value="attendance" asChild><Link href="/admin/attendance"><CalendarCheck className="mr-2 h-4 w-4" /> My Attendance</Link></TabsTrigger>
        </TabsList>
    </Tabs>
  );


  return (
    <>
      <div className="w-full">
         {isClient && (userRole === 'superadmin' ? <SuperAdminTabs /> : <TrainerTabs />)}
      </div>
    </>
  );
}
