
"use client";

import { useParams } from 'next/navigation'
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Batch } from '@/lib/types';
import { JoinMeetingForm } from '@/components/features/join-meeting-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getRedirectLink, getBatchById } from '@/app/actions';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


export default function RegistrationPage() {
  const { toast } = useToast();
  const params = useParams();
  const batchId = params.batchId as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!batchId) return;
    async function fetchBatchDetails() {
      setLoading(true);
      const fetchedBatch = await getBatchById(batchId);
      if (!fetchedBatch) {
        notFound();
      } else {
        setBatch(fetchedBatch);
      }
      setLoading(false);
    }
    fetchBatchDetails();
  }, [batchId]);

  const handleJoinSuccess = async () => {
    toast({
      title: "Verification Successful!",
      description: "You are being redirected to the meeting. Please wait.",
    });

    try {
      const { link } = await getRedirectLink(batchId);
      
      if (link && link.trim() !== '') {
        setTimeout(() => {
          window.location.href = link;
        }, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Redirect Not Configured",
          description: `The meeting link has not been set by the admin for this training.`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error fetching redirect link:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not retrieve redirect link from the database.",
      });
    }
  };

  if (loading) {
      return (
          <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen">
              <div className="w-full max-w-md space-y-8">
                  <div className="flex flex-col items-center space-y-4">
                      <Skeleton className="h-10 w-3/4" />
                      <Skeleton className="h-5 w-1/2" />
                  </div>
                  <Card>
                      <CardHeader>
                          <Skeleton className="h-6 w-1/2 mb-2"/>
                          <Skeleton className="h-4 w-3/4"/>
                      </CardHeader>
                      <CardContent className="space-y-6">
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-10 w-full" />
                      </CardContent>
                  </Card>
              </div>
          </main>
      );
  }

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col items-center justify-center text-center mb-8 md:mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
              {batch?.name || 'Training Program'}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Enter your IITP No. to join the meeting.
            </p>
        </div>
        
        <div className="flex justify-center w-full">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader>
                    <CardTitle>Join Meeting</CardTitle>
                    <CardDescription>Verify your identity to get the meeting link.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <JoinMeetingForm 
                        batchId={batchId}
                        onSuccess={handleJoinSuccess}
                    />
                    </CardContent>
                </Card>
            </div>
        </div>
        <div className="text-center mt-8">
            <Link href="/" passHref>
                <button className="text-primary hover:underline">Back to Home</button>
            </Link>
        </div>
      </div>
    </main>
  );
}
