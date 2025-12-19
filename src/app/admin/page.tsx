

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Batch, Participant, Trainer, Course, Subject, Unit, Lesson, SuperAdmin, Organization, OrganizationAdmin, Exam, Question, Registration, FormAdmin } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Users, Presentation, Loader2, CalendarCheck, BookCopy, Settings, Book, Image as ImageIcon, UserCog, FileText, BarChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addCourse, getBatches, getParticipants, getTrainers, getCourses, getSiteConfig, updateSiteConfig } from '@/app/actions';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';


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
  const [isAddCourseOpen, setAddCourseOpen] = useState(false);

  // Form & Filter states
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseStatus, setNewCourseStatus] = useState<'active' | 'coming-soon' | 'deactivated'>('active');
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
                     <Card>
                        <CardHeader>
                            <CardTitle>Reports</CardTitle>
                            <CardDescription>View key statistics and export data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full">
                                <Link href="/admin/reports">
                                    <BarChart className="mr-2 h-4 w-4" /> View Reports
                                </Link>
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
