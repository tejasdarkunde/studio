
"use client";

import { useState, useEffect } from 'react';
import type { Batch } from '@/lib/types';
import { RegistrationsTable } from '@/components/features/registrations-table';
import { EditBatchNameDialog } from '@/components/features/edit-batch-name-dialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, PlusCircle, Pencil } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getBatches, startNewBatch, updateBatchName } from '@/app/actions';

export default function AdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [diplomaLink, setDiplomaLink] = useState('');
  const [advanceDiplomaLink, setAdvanceDiplomaLink] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (isAuthenticated) {
        fetchBatches();
    }
    try {
      const storedDiplomaLink = localStorage.getItem('diplomaZoomLink');
      if (storedDiplomaLink) setDiplomaLink(storedDiplomaLink);
      
      const storedAdvanceDiplomaLink = localStorage.getItem('advanceDiplomaZoomLink');
      if (storedAdvanceDiplomaLink) setAdvanceDiplomaLink(storedAdvanceDiplomaLink);
    } catch (error) {
      console.error("Failed to parse data from storage", error);
    }
  }, [isAuthenticated]);

  const fetchBatches = async () => {
    const fetchedBatches = await getBatches();
    setBatches(fetchedBatches);
  };

  const handleSaveLinks = () => {
    try {
      localStorage.setItem('diplomaZoomLink', diplomaLink);
      localStorage.setItem('advanceDiplomaZoomLink', advanceDiplomaLink);
      toast({
        title: "Links Saved!",
        description: "The Zoom links have been successfully updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not save the links to local storage.",
      });
      console.error("Failed to save links to localStorage", error);
    }
  };
  
  const handleStartNewBatch = async () => {
    const result = await startNewBatch();
    if (result.success && result.newBatch) {
        const newBatchName = result.newBatch.name;
        toast({
            title: "New Batch Started",
            description: `${newBatchName} is now active. New registrations will be added here.`,
        });
        fetchBatches(); // Re-fetch to get all batches including the new one.
    } else {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Could not start new batch.",
        });
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Bsa@123') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handleEditBatchName = (batch: Batch) => {
    setEditingBatch(batch);
  };
  
  const handleSaveBatchName = async (newName: string) => {
    if (!editingBatch) return;

    const result = await updateBatchName(editingBatch.id, newName);

    if (result.success) {
      toast({
          title: "Batch Name Updated",
          description: `Batch was renamed to "${newName}".`,
      });
      fetchBatches(); // Refresh batches from DB
    } else {
      toast({
          variant: "destructive",
          title: "Database Error",
          description: result.error || "Could not save the updated batch name.",
      });
    }
    setEditingBatch(null);
  };
  
  const activeBatch = batches.find(b => b.active);
  const sortedBatches = [...batches].sort((a, b) => new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime());
  
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

  const getDefaultAccordionOpenValue = () => {
     if (sortedBatches.length === 0) return [];
     return activeBatch ? [`batch-${activeBatch.id}`] : [`batch-${sortedBatches[0].id}`]
  }

  return (
    <>
      {editingBatch && (
        <EditBatchNameDialog
            isOpen={!!editingBatch}
            onClose={() => setEditingBatch(null)}
            onSave={handleSaveBatchName}
            currentName={editingBatch.name}
        />
      )}
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <div className="flex flex-col">
              <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
                  Admin Access
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                  Manage event registrations and settings.
              </p>
          </div>
          <Link href="/" passHref>
              <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Event &amp; Meeting Settings</CardTitle>
              <CardDescription>Manage event batches and Zoom links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={handleStartNewBatch} className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Start New Event Batch
                  </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diploma-link">Diploma Zoom Link</Label>
                <Input 
                  id="diploma-link"
                  placeholder="Enter Diploma Zoom link"
                  value={diplomaLink}
                  onChange={(e) => setDiplomaLink(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advance-diploma-link">Advance Diploma Zoom Link</Label>
                <Input 
                  id="advance-diploma-link"
                  placeholder="Enter Advance Diploma Zoom link"
                  value={advanceDiplomaLink}
                  onChange={(e) => setAdvanceDiplomaLink(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveLinks}>
                <Save className="mr-2 h-4 w-4" />
                Save Links
              </Button>
            </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Registrations by Batch</CardTitle>
                  <CardDescription>View and export registrations for each event batch.</CardDescription>
              </CardHeader>
              <CardContent>
                  {sortedBatches.length > 0 ? (
                      <Accordion type="multiple" defaultValue={getDefaultAccordionOpenValue()}>
                          {sortedBatches.map(batch => (
                              <AccordionItem key={batch.id} value={`batch-${batch.id}`}>
                                  <AccordionTrigger>
                                      <div className="flex justify-between items-center w-full pr-4">
                                        <div className="flex items-center gap-2">
                                          <span>
                                              {batch.name} ({batch.registrations.length} registrations)
                                          </span>
                                          {batch.active && <span className="ml-2 text-xs font-semibold text-primary py-0.5 px-2 bg-primary/10 rounded-full">Active</span>}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-muted-foreground">
                                                Created: {new Date(batch.createdAt as Date).toLocaleDateString()}
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation(); 
                                                  handleEditBatchName(batch)
                                                }}
                                                className="h-8 w-auto px-2"
                                            >
                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                            </Button>
                                        </div>
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
                      <div className="text-center text-muted-foreground p-8">
                          No registration batches found. Start a new batch to begin collecting registrations.
                      </div>
                  )}
              </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
