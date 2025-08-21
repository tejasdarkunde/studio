
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Batch, Participant } from '@/lib/types';
import { RegistrationsTable } from '@/components/features/registrations-table';
import { EditBatchDialog } from '@/components/features/edit-batch-name-dialog';
import { DeleteBatchDialog } from '@/components/features/delete-batch-dialog';
import { AddParticipantDialog } from '@/components/features/add-participant-dialog';
import { ImportParticipantsDialog } from '@/components/features/import-participants-dialog';
import { ParticipantsTable } from '@/components/features/participants-table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, UserPlus, Upload, Download, Users, BookUser, BookUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { updateBatch, getBatches, createBatch, deleteBatch, getParticipants, addParticipant, addParticipantsInBulk } from '@/app/actions';

export default function AdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isAddParticipantOpen, setAddParticipantOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);

  const { toast } = useToast();

  const fetchAllData = async () => {
    const [fetchedBatches, fetchedParticipants] = await Promise.all([
      getBatches(),
      getParticipants()
    ]);
    setBatches(fetchedBatches);
    setParticipants(fetchedParticipants);
  };

  useEffect(() => {
    setIsClient(true);
    if (isAuthenticated) {
        fetchAllData();
    }
  }, [isAuthenticated]);

  const reportStats = useMemo(() => {
    const totalRegistrations = batches.reduce((acc, batch) => acc + batch.registrations.length, 0);
    
    const diplomaEnrollments = batches
      .filter(b => b.name.toLowerCase().includes('diploma') && !b.name.toLowerCase().includes('advance'))
      .reduce((acc, batch) => acc + batch.registrations.length, 0);
    
    const advanceDiplomaEnrollments = batches
      .filter(b => b.name.toLowerCase().includes('advance diploma'))
      .reduce((acc, batch) => acc + batch.registrations.length, 0);

    return {
      totalRegistrations,
      diplomaEnrollments,
      advanceDiplomaEnrollments
    };
  }, [batches]);
  
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Bsa@123') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
  };

  const handleDeleteBatch = (batch: Batch) => {
    setDeletingBatch(batch);
  };
  
  const handleSaveBatch = async (details: { name: string; startDate?: Date; startTime: string; endTime: string; meetingLink: string }) => {
    if (!editingBatch) return;

    const result = await updateBatch(editingBatch.id, {
        name: details.name,
        startDate: details.startDate?.toISOString(),
        startTime: details.startTime,
        endTime: details.endTime,
        meetingLink: details.meetingLink,
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

  const handleCreateBatch = async (details: { name: string; startDate?: Date; startTime: string; endTime: string; meetingLink: string }) => {
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
        startDate: details.startDate,
        startTime: details.startTime,
        endTime: details.endTime,
        meetingLink: details.meetingLink,
    });

    if (result.success) {
        toast({
            title: "Batch Created",
            description: `New batch "${details.name}" was successfully created.`,
        });
        fetchAllData();
    } else {
        toast({
            variant: "destructive",
            title: "Error Creating Batch",
            description: result.error || "Could not create the new batch.",
        });
    }
    setCreateDialogOpen(false);
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

  const handleAddParticipant = async (details: Omit<Participant, 'id' | 'createdAt'>) => {
    const result = await addParticipant(details);
    if(result.success) {
        toast({
            title: "Participant Added",
            description: `${details.name} has been added to the central directory.`,
        });
        fetchAllData();
    } else {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Could not add the participant."
        });
    }
    setAddParticipantOpen(false);
  };

  const handleDownloadTemplate = () => {
    const headers = "name,iitpNo,mobile,organization,enrolledCourses\n";
    const example = "John Doe,IIPT123,1234567890,Example Org,\"Course A, Course B\"\n";
    const csvContent = headers + example;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'participants_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSave = async (importedParticipants: Omit<Participant, 'id'|'createdAt'>[]) => {
    if (importedParticipants.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Participants',
        description: 'No valid participant data was found in the file to import.',
      });
      return;
    }

    const result = await addParticipantsInBulk(importedParticipants);

    if (result.success) {
      toast({
        title: 'Import Successful',
        description: `${importedParticipants.length} participants have been added to the directory.`,
      });
      fetchAllData();
    } else {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: result.error || 'An unexpected error occurred during the bulk import.',
      });
    }

    setImportDialogOpen(false);
  };
  
  if (!isClient) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Please enter the password to view this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <>
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
                startDate: editingBatch.startDate,
                startTime: editingBatch.startTime,
                endTime: editingBatch.endTime,
                meetingLink: editingBatch.meetingLink,
            } : undefined}
        />
      )}
       <AddParticipantDialog 
        isOpen={isAddParticipantOpen}
        onClose={() => setAddParticipantOpen(false)}
        onSave={handleAddParticipant}
      />
      <ImportParticipantsDialog
        isOpen={isImportDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSave={handleImportSave}
      />

      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <div className="flex flex-col">
              <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
                  Admin Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                  Manage training batches, registrations, and participants.
              </p>
          </div>
          <Link href="/" passHref>
              <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-12">

          <Card>
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>A high-level overview of your training statistics.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <Card className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-primary" />
                    <p className="text-2xl font-bold">{reportStats.totalRegistrations}</p>
                    <p className="text-sm text-muted-foreground">Total Registrations</p>
                  </div>
                </Card>
                 <Card className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <BookUser className="h-8 w-8 text-primary" />
                    <p className="text-2xl font-bold">{reportStats.diplomaEnrollments}</p>
                    <p className="text-sm text-muted-foreground">Diploma Enrollments</p>
                  </div>
                </Card>
                 <Card className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <BookUp className="h-8 w-8 text-primary" />
                    <p className="text-2xl font-bold">{reportStats.advanceDiplomaEnrollments}</p>
                    <p className="text-sm text-muted-foreground">Advance Diploma Enrollments</p>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
          
          <Separator />
          
          <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Training Batches</CardTitle>
                  <CardDescription>View and manage all training batches and their registrations.</CardDescription>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Batch
                </Button>
              </CardHeader>
              <CardContent>
                {batches && batches.length > 0 ? (
                  <Accordion type="multiple" className="w-full">
                      {batches.map(batch => (
                          <AccordionItem key={batch.id} value={`batch-${batch.id}`}>
                              <AccordionTrigger>
                                  <div className="flex justify-between items-center w-full pr-4">
                                    <div className="flex items-center gap-2">
                                      <span>
                                          {batch.name} ({batch.registrations.length} registrations)
                                      </span>
                                    </div>
                                  </div>
                              </AccordionTrigger>
                              <AccordionContent>
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
                    <p>Click "Create New Batch" to get started.</p>
                  </div>
                )}
              </CardContent>
          </Card>
          
          <Separator />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Participants</CardTitle>
                <CardDescription>Manage the central directory of all participants.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleDownloadTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                  </Button>
                  <Button onClick={() => setImportDialogOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Import from CSV
                  </Button>
                  <Button onClick={() => setAddParticipantOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add New Participant
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
                <ParticipantsTable participants={participants} />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
