
"use client";

import { useState, useEffect } from 'react';
import type { Registration } from '@/lib/types';
import { RegistrationsTable } from '@/components/features/registrations-table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

export default function AdminPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [diplomaLink, setDiplomaLink] = useState('');
  const [advanceDiplomaLink, setAdvanceDiplomaLink] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    try {
      const storedAuth = sessionStorage.getItem('isAdminAuthenticated');
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
      }

      const storedRegistrations = localStorage.getItem('eventlink-registrations');
      if (storedRegistrations) {
        const parsedRegistrations = JSON.parse(storedRegistrations);
        if (Array.isArray(parsedRegistrations)) {
            setRegistrations(parsedRegistrations);
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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Bsa@123') {
      setIsAuthenticated(true);
      setError('');
      try {
        sessionStorage.setItem('isAdminAuthenticated', 'true');
      } catch (error) {
        console.error("Could not save auth state to sessionStorage", error);
      }
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  if (!isClient) {
    return null; // Or a loading spinner
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
            <CardTitle>Meeting Links</CardTitle>
            <CardDescription>Manage the Zoom links for the events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

        <div className="w-full">
            <RegistrationsTable 
                registrations={registrations}
            />
        </div>
      </div>
    </main>
  );
}
