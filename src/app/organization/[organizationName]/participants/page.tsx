
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Participant, OrganizationAdmin, Organization, Course } from '@/lib/types';
import { getParticipants, getOrganizations, getCourses, addParticipant } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParticipantsTable } from '@/components/features/participants-table';
import { AddParticipantDialog } from '@/components/features/add-participant-dialog';
import { useToast } from '@/hooks/use-toast';

export default function OrganizationParticipantsPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const organizationName = useMemo(() => decodeURIComponent(params.organizationName as string), [params.organizationName]);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isAddParticipantOpen, setAddParticipantOpen] = useState(false);

    const fetchParticipantsData = useCallback(async () => {
        setLoading(true);
        const [allParticipants, allOrganizations, allCourses] = await Promise.all([
            getParticipants(),
            getOrganizations(),
            getCourses()
        ]);
        
        const orgParticipants = allParticipants.filter(p => p.organization === organizationName);
        setParticipants(orgParticipants);
        setOrganizations(allOrganizations);
        setCourses(allCourses);
        setLoading(false);
    }, [organizationName]);

    useEffect(() => {
        const role = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (role === 'organization-admin' && userJson) {
            const user = JSON.parse(userJson) as OrganizationAdmin;
            if (user.organizationName === organizationName) {
                setIsAuthenticated(true);
                fetchParticipantsData();
            } else {
                 router.push('/login');
            }
        } else {
            router.push('/login');
        }
    }, [organizationName, fetchParticipantsData, router]);

    const handleAddParticipant = async (details: Omit<Participant, 'id' | 'createdAt' | 'completedLessons' | 'deniedCourses'>) => {
        const result = await addParticipant(details);
        if(result.success) {
            toast({
                title: "Participant Added",
                description: `${details.name} has been added.`,
            });
            fetchParticipantsData();
            setAddParticipantOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Error Adding Participant",
                description: result.error || "Could not add the participant."
            });
        }
    };

    if (loading || !isAuthenticated) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }
    
    return (
        <>
            <AddParticipantDialog 
                isOpen={isAddParticipantOpen}
                onClose={() => setAddParticipantOpen(false)}
                onSave={handleAddParticipant}
                courses={courses}
                organizations={organizations}
            />
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    Participants
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    A list of all employees from your organization in the system.
                </p>
            </div>
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>Participants from {organizationName}</CardTitle>
                        <CardDescription>View and export participant data.</CardDescription>
                    </div>
                    <Button onClick={() => setAddParticipantOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Participant
                    </Button>
                </CardHeader>
                <CardContent>
                    <ParticipantsTable participants={participants} onDataRefreshed={() => {}} onUpdateSelected={async () => ({success: false, error: "Not available for organization admins."})} />
                </CardContent>
            </Card>
        </>
    )
}
