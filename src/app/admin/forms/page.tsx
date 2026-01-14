
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Form, FormAdmin } from '@/lib/types';
import { getAllForms, getFormAdmins } from '@/app/actions';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminFormsPage() {
    const [forms, setForms] = useState<Form[]>([]);
    const [formAdmins, setFormAdmins] = useState<FormAdmin[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAllFormsData = useCallback(async () => {
        setLoading(true);
        const [fetchedForms, fetchedAdmins] = await Promise.all([
            getAllForms(),
            getFormAdmins(),
        ]);
        setForms(fetchedForms);
        setFormAdmins(fetchedAdmins);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAllFormsData();
    }, [fetchAllFormsData]);

    const getAdminNameById = (id: string) => {
        return formAdmins.find(admin => admin.id === id)?.name || 'Unknown Admin';
    }

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Form Management</CardTitle>
                    <CardDescription>View all forms created across the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Form Title</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead>Date Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : forms.length > 0 ? (
                                    forms.map(form => (
                                        <TableRow key={form.id}>
                                            <TableCell className="font-medium">{form.title}</TableCell>
                                            <TableCell>{getAdminNameById(form.createdBy)}</TableCell>
                                            <TableCell>{new Date(form.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                {/* Actions like view, view responses, delete will go here */}
                                                <Button variant="ghost" size="sm">View</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No forms have been created yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}

