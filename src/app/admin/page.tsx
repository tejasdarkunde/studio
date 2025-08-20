
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

export default function AdminPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
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
    try {
      const storedData = localStorage.getItem('eventlink-data');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.batches && Array.isArray(parsedData.batches)) {
          setBatches(parsedData.batches);
        }
        if (parsedData.activeBatchId) {
          setActiveBatchId(parsedData.activeBatchId);
        }
      }
      
      const storedDiplomaLink = localStorage.getItem('diplomaZoomLink');
      if (storedDiplomaLink) setDiplomaLink(storedDiplomaLink);
      
      const storedAdvanceDiplomaLink = localStorage.getItem('advanceDiplomaZoomLink');
      if (storedAdvanceDiplomaLink) setAdvanceDiplomaLink(storedAdvanceDiplomaLink);

    } catch (error) {
      console.error("Failed to parse data from storage", error);
    }
  }, []);

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
  
  const handleStartNewBatch = () => {
    const newBatchId = batches.length > 0 ? Math.max(...batches.map(b => b.id)) + 1 : 1;
    const newBatch: Batch = {
        id: newBatchId,
        name: `Event Batch ${newBatchId}`,
        createdAt: new Date(),
        registrations: [],
    };

    const updatedBatches = [...batches, newBatch];
    setBatches(updatedBatches);
    setActiveBatchId(newBatchId);

    try {
        const dataToStore = { batches: updatedBatches, activeBatchId: newBatchId };
        localStorage.setItem('eventlink-data', JSON.stringify(dataToStore));
        toast({
            title: "New Batch Started",
            description: `${newBatch.name} is now active. New registrations will be added here.`,
        });
    } catch (error) {
        console.error("Failed to save new batch to localStorage", error);
        toast({
            variant: "destructive",
            title: "Storage Error",
            description: "Could not save the new batch.",
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
  
  const handleSaveBatchName = (newName: string) => {
    if (!editingBatch) return;

    const updatedBatches = batches.map(b => 
      b.id === editingBatch.id ? { ...b, name: newName } : b
    );
    setBatches(updatedBatches);

    try {
        const dataToStore = { batches: updatedBatches, activeBatchId };
        localStorage.setItem('eventlink-data', JSON.stringify(dataToStore));
        toast({
            title: "Batch Name Updated",
            description: `Batch "${editingBatch.name}" was renamed to "${newName}".`,
        });
    } catch (error) {
        console.error("Failed to save updated batch name to localStorage", error);
        toast({
            variant: "destructive",
            title: "Storage Error",
            description: "Could not save the updated batch name.",
        });
    }
    setEditingBatch(null);
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

  const getDefaultAccordionOpenValue = () => {
     if (batches.length === 0) return [];
     const activeBatch = batches.find(b => b.id === activeBatchId);
     return activeBatch ? [`batch-${activeBatch.id}`] : [`batch-${batches[batches.length - 1].id}`]
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
                  {batches.length > 0 ? (
                      <Accordion type="multiple" defaultValue={getDefaultAccordionOpenValue()}>
                          {batches.map(batch => (
                              <AccordionItem key={batch.id} value={`batch-${batch.id}`}>
                                  <AccordionTrigger>
                                      <div className="flex justify-between items-center w-full pr-4">
                                        <div className="flex items-center gap-2">
                                          <span>
                                              {batch.name} ({batch.registrations.length} registrations)
                                          </span>
                                          {batch.id === activeBatchId && <span className="ml-2 text-xs font-semibold text-primary py-0.5 px-2 bg-primary/10 rounded-full">Active</span>}
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            Created: {new Date(batch.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                      <div className="flex items-center justify-end p-2 border-b">
                                          <Button 
                                              variant="ghost" 
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditBatchName(batch)
                                              }}
                                          >
                                              <Pencil className="mr-2 h-4 w-4" /> Edit Batch Name
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
