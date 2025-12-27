
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Participant, Organization, Supervisor } from '@/lib/types';
import { getParticipantsByOrganization, getOrganizations, updateSelectedParticipants } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { ParticipantsTable } from '@/components/features/participants-table';

export default function SupervisorTraineesPage() {
    const router = useRouter();
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const userRole = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (userRole === 'supervisor' && userJson) {
            const currentUser = JSON.parse(userJson) as Supervisor;
            setSupervisor(currentUser);
            
            if (currentUser.organization) {
                setLoading(true);
                const [fetchedParticipants, fetchedOrganizations] = await Promise.all([
                    getParticipantsByOrganization(currentUser.organization),
                    getOrganizations()
                ]);
                setParticipants(fetchedParticipants);
                setOrganizations(fetchedOrganizations);
                setLoading(false);
            }
        } else {
            router.push('/supervisor-login');
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="pb-8">
            <ParticipantsTable
                participants={participants}
                organizations={organizations}
                onUpdateSelected={updateSelectedParticipants}
                onDataRefreshed={fetchData}
                defaultOrganization={supervisor?.organization}
            />
        </div>
    );
}
