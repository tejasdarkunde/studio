
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
import { Hourglass, Timer, XCircle } from 'lucide-react';


export default function RegistrationPage() {
  const { toast } = useToast();
  const params = useParams();
  const batchId = params.batchId as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'upcoming' | 'active' | 'past' | 'cancelled'>('upcoming');
  const [timeUntilStart, setTimeUntilStart] = useState(0);

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
  
  useEffect(() => {
    if (!batch) return;

    if(batch.isCancelled) {
        setSessionStatus('cancelled');
        return;
    }
    
    if (!batch.startDate || !batch.startTime || !batch.endTime) {
        setSessionStatus('past');
        return;
    }

    const calculateStatus = () => {
        const now = new Date().getTime();
        
        const [startHour, startMinute] = batch.startTime.split(':').map(Number);
        const [endHour, endMinute] = batch.endTime.split(':').map(Number);

        const startDate = new Date(batch.startDate);
        startDate.setHours(startHour, startMinute, 0, 0);
        
        const endDate = new Date(batch.startDate);
        endDate.setHours(endHour, endMinute, 0, 0);

        // Registration opens 2 minutes before start time
        const registrationOpenTime = startDate.getTime() - (2 * 60 * 1000);

        if (now < registrationOpenTime) {
            setSessionStatus('upcoming');
            setTimeUntilStart(registrationOpenTime - now);
        } else if (now >= registrationOpenTime && now <= endDate.getTime()) {
            setSessionStatus('active');
            setTimeUntilStart(0);
        } else {
            setSessionStatus('past');
            setTimeUntilStart(0);
        }
    };
    
    calculateStatus();
    
    const interval = setInterval(calculateStatus, 1000);
    return () => clearInterval(interval);

  }, [batch]);


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
  
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours.toString().padStart(2, '0')}h`);
    parts.push(`${minutes.toString().padStart(2, '0')}m`);
    parts.push(`${seconds.toString().padStart(2, '0')}s`);
    
    return parts.join(' : ');
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
            <p className="text-xl font-bold text-primary tracking-tight">
                BSA Edutech India Pvt. Ltd.
            </p>
            <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">
              {batch?.name || 'Training Program'}
            </h1>
             {sessionStatus === 'active' && (
                <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                    Enter your IITP No. to join the meeting.
                </p>
            )}
        </div>
        
        <div className="flex justify-center w-full">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader>
                       <CardTitle>
                        {sessionStatus === 'past' && 'Session Ended'}
                        {sessionStatus === 'active' && 'Join Meeting'}
                        {sessionStatus === 'upcoming' && 'Session Starting Soon'}
                        {sessionStatus === 'cancelled' && 'Session Cancelled'}
                       </CardTitle>
                        <CardDescription>
                            {sessionStatus === 'past' && 'This training session is no longer active.'}
                            {sessionStatus === 'active' && 'Verify your identity to get the meeting link.'}
                            {sessionStatus === 'upcoming' && 'The registration will open automatically.'}
                            {sessionStatus === 'cancelled' && 'This session has been cancelled by the administrator.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       {sessionStatus === 'past' && (
                             <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                                <Hourglass className="h-8 w-8 mb-2" />
                                <p>This session has ended and is no longer available.</p>
                             </div>
                        )}
                        {sessionStatus === 'active' && (
                            <JoinMeetingForm 
                                batchId={batchId}
                                onSuccess={handleJoinSuccess}
                            />
                        )}
                         {sessionStatus === 'upcoming' && (
                             <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                                <Timer className="h-8 w-8 mb-2 text-primary" />
                                <p className="font-semibold text-primary mb-1">Session Starts In:</p>
                                <p className="text-2xl font-bold tracking-wider">{formatTime(timeUntilStart)}</p>
                             </div>
                        )}
                         {sessionStatus === 'cancelled' && (
                             <div className="flex flex-col items-center justify-center h-24 text-destructive-foreground bg-destructive/90 rounded-md p-4">
                                <XCircle className="h-8 w-8 mb-2" />
                                <p className="font-semibold text-center">{batch?.cancellationReason || 'No reason provided.'}</p>
                             </div>
                        )}
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
