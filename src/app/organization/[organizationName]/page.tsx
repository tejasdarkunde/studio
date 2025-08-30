
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Batch, Participant, Trainer, Course, SuperAdmin, OrganizationAdmin } from '@/lib/types';
import { getBatches, getParticipants, getCourses } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Presentation, BookUser, UserCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParticipantsTable } from '@/components/features/participants-table';
import { RegistrationsTable } from '@/components/features/registrations-table';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { AttendanceReport } from '@/components/features/attendance-report';


export default function OrganizationDashboardPage() {
    const router = useRouter();
    const params = useParams();
    const organizationName = useMemo(() => decodeURIComponent(params.organizationName as string), [params.organizationName]);

    // Data states
    const [batches, setBatches] = useState<Batch[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    
    // Auth and loading states
    const [isClient, setIsClient] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState<OrganizationAdmin | null>(null);
    const [loading, setLoading] = useState(true);

    const { toast } = useToast();

    const fetchOrganizationData = useCallback(async () => {
        setLoading(true);
        const [allParticipants, allBatches, allCourses] = await Promise.all([
            getParticipants(),
            getBatches(),
            getCourses()
        ]);

        const orgParticipants = allParticipants.filter(p => p.organization === organizationName);
        setParticipants(orgParticipants);
        
        // Filter batches to only include those where at least one participant from the organization is registered
        const orgBatches = allBatches.filter(batch => 
            batch.registrations.some(reg => orgParticipants.some(p => p.iitpNo === reg.iitpNo))
        ).map(batch => ({
            ...batch,
            // Also filter the registrations within each batch to only show those from the organization
            registrations: batch.registrations.filter(reg => orgParticipants.some(p => p.iitpNo === reg.iitpNo))
        }));

        setBatches(orgBatches);
        setCourses(allCourses);
        setLoading(false);
    }, [organizationName]);

    useEffect(() => {
        setIsClient(true);
        const role = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (role === 'organization-admin' && userJson) {
            const user = JSON.parse(userJson) as OrganizationAdmin;
            if (user.organizationName === organizationName) {
                setIsAuthenticated(true);
                setCurrentUser(user);
                fetchOrganizationData();
            } else {
                 router.push('/login');
            }
        } else {
            router.push('/login');
        }
    }, [organizationName, fetchOrganizationData, router]);

    const stats = useMemo(() => {
        const totalParticipants = participants.length;
        const totalSessionsAttended = batches.reduce((acc, batch) => acc + batch.registrations.length, 0);

        const courseEnrollments: { [courseName: string]: number } = {};
        participants.forEach(p => {
            p.enrolledCourses?.forEach(courseName => {
                courseEnrollments[courseName] = (courseEnrollments[courseName] || 0) + 1;
            })
        });

        return { totalParticipants, totalSessionsAttended, courseEnrollments };
    }, [participants, batches]);


    if (!isClient || loading || !isAuthenticated) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }
    
    return (
        <div className="min-h-screen flex flex-col">
             <header className="bg-background border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
                     <p className="text-xl font-bold text-primary tracking-tight">BSA Training Academy, Pune</p>
                    <div className='flex items-center gap-2'>
                        <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {currentUser?.name}</span>
                        <Button variant="outline" onClick={() => {
                                sessionStorage.clear();
                                router.push('/login');
                        }}>Logout</Button>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8 flex-grow">
                 <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {organizationName} Dashboard
                    </h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                       View your organization's training and attendance data.
                    </p>
                </div>
                <Tabs defaultValue="overview">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="participants">Participants</TabsTrigger>
                        <TabsTrigger value="trainings">Trainings</TabsTrigger>
                        <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Organization Stats</CardTitle>
                                <CardDescription>A quick look at your organization's training data.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                    <Users className="h-8 w-8 text-primary" />
                                    <p className="text-2xl font-bold">{stats.totalParticipants}</p>
                                    <p className="text-sm text-muted-foreground">Total Participants</p>
                                    </div>
                                </Card>
                                <Card className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                    <Presentation className="h-8 w-8 text-primary" />
                                    <p className="text-2xl font-bold">{stats.totalSessionsAttended}</p>
                                    <p className="text-sm text-muted-foreground">Total Sessions Attended</p>
                                    </div>
                                </Card>
                                {Object.entries(stats.courseEnrollments).map(([courseName, count]) => (
                                    <Card key={courseName} className="p-4 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                        <BookUser className="h-8 w-8 text-primary" />
                                        <p className="text-2xl font-bold">{count}</p>
                                        <p className="text-sm text-muted-foreground">{courseName} Enrollments</p>
                                        </div>
                                    </Card>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="participants" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Participants from {organizationName}</CardTitle>
                                <CardDescription>A list of all employees from your organization in the system.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ParticipantsTable participants={participants} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="trainings" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Training History</CardTitle>
                                <CardDescription>Training sessions attended by employees from {organizationName}.</CardDescription>
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
                                                    <Badge variant={batch.course === 'Diploma' ? 'default' : batch.course === 'Advance Diploma' ? 'secondary' : 'outline'} className="whitespace-normal text-center max-w-[200px]">
                                                        {batch.course}
                                                    </Badge>
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {batch.registrations.length} participant(s) from your organization
                                                </span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
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
                                <p>No training attendance found for your organization.</p>
                                </div>
                            )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="attendance" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Attendance Report</CardTitle>
                                <CardDescription>Grid view of attendance for your organization's participants.</CardDescription>
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
        </div>
    )
}
