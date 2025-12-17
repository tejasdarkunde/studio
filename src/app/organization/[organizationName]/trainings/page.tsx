
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Batch, Participant, OrganizationAdmin } from '@/lib/types';
import { getBatches, getParticipants } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { RegistrationsTable } from '@/components/features/registrations-table';

export default function OrganizationTrainingsPage() {
    const router = useRouter();
    const params = useParams();
    const organizationName = useMemo(() => decodeURIComponent(params.organizationName as string), [params.organizationName]);

    const [batches, setBatches] = useState<Batch[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchTrainingsData = useCallback(async () => {
        setLoading(true);
        const [allParticipants, allBatches] = await Promise.all([
            getParticipants(),
            getBatches(),
        ]);

        const orgParticipants = allParticipants.filter(p => p.organization === organizationName);
        
        const orgBatches = allBatches.filter(batch => {
            return batch.organizations?.includes(organizationName) || batch.registrations.some(reg => orgParticipants.some(p => p.iitpNo === reg.iitpNo));
        }).map(batch => ({
            ...batch,
            registrations: batch.registrations.filter(reg => orgParticipants.some(p => p.iitpNo === reg.iitpNo))
        }));

        setBatches(orgBatches);
        setLoading(false);
    }, [organizationName]);

    useEffect(() => {
        const role = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (role === 'organization-admin' && userJson) {
            const user = JSON.parse(userJson) as OrganizationAdmin;
            if (user.organizationName === organizationName) {
                setIsAuthenticated(true);
                fetchTrainingsData();
            } else {
                 router.push('/admin-login');
            }
        } else {
            router.push('/admin-login');
        }
    }, [organizationName, fetchTrainingsData, router]);

    if (loading || !isAuthenticated) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }
    
    return (
        <>
             <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    Trainings
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Training sessions attended by employees from {organizationName}.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Training History</CardTitle>
                    <CardDescription>Click on a batch to see which of your employees attended.</CardDescription>
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
        </>
    )
}
