
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Participant, Supervisor } from '@/lib/types';
import { getParticipantsByOrganization } from '@/app/actions';
import { Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SupervisorTraineesPage() {
    const router = useRouter();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTrainees = useCallback(async (organization: string) => {
        setLoading(true);
        try {
            const data = await getParticipantsByOrganization(organization);
            setParticipants(data);
        } catch (error) {
            console.error("Failed to fetch participants:", error);
            setParticipants([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const userRole = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (userRole === 'supervisor' && userJson) {
            const currentUser = JSON.parse(userJson) as Supervisor;
            setSupervisor(currentUser);
            if (currentUser.organization) {
                fetchTrainees(currentUser.organization);
            } else {
                setLoading(false);
                setParticipants([]);
            }
        } else {
            router.push('/supervisor-login');
        }
    }, [router, fetchTrainees]);

    const filteredParticipants = useMemo(() => {
        if (!searchTerm) return participants;
        return participants.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.iitpNo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [participants, searchTerm]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="pb-8">
            <Card>
                <CardHeader>
                    <CardTitle>Trainees from {supervisor?.organization || 'Your Organization'}</CardTitle>
                    <CardDescription>A list of all participants registered under your organization.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or IITP No..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <ScrollArea className="h-[60vh] border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>IITP No</TableHead>
                                    <TableHead>Mobile</TableHead>
                                    <TableHead>Enrolled Courses</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredParticipants.length > 0 ? (
                                    filteredParticipants.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell>{p.iitpNo}</TableCell>
                                            <TableCell>{p.mobile}</TableCell>
                                            <TableCell>{p.enrolledCourses?.join(', ') || 'None'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No trainees found for your organization.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
