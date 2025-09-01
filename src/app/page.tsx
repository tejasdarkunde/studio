
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, Clock, Users, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Batch } from '@/lib/types';
import { getBatches } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const TrainingCard = ({ batch, isPast }: { batch: Batch; isPast: boolean }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not set';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  return (
    <Card className="flex flex-col">
        <CardHeader>
           <div className="flex justify-between items-start mb-2">
             <Badge variant={batch.course === 'Diploma' ? 'default' : batch.course === 'Advance Diploma' ? 'secondary' : 'outline'} className="whitespace-normal text-center max-w-full">
              {batch.course}
            </Badge>
            {batch.isCancelled && (
                <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Cancelled
                </Badge>
            )}
          </div>
          <CardTitle>{batch.name}</CardTitle>
          <CardDescription className="flex items-center gap-2 pt-1">
            {batch.startDate ? (
              <>
                <Calendar className="h-4 w-4" /> 
                <span>{formatDate(batch.startDate)}</span>
                {(batch.startTime && batch.endTime) && (
                  <>
                    <Clock className="h-4 w-4 ml-2" />
                    <span>{formatTime(batch.startTime)} - {formatTime(batch.endTime)}</span>
                  </>
                )}
              </>
            ) : (
                <span>(Date not set)</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="text-sm text-muted-foreground flex items-center">
                <Users className="h-4 w-4 mr-2" />
                {batch.registrations.length} registration(s)
            </div>
        </CardContent>
        <CardFooter>
          {isPast || batch.isCancelled ? (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button className="w-full" disabled>
                           {batch.isCancelled ? 'Cancelled' : 'View Details'} <ArrowRight className="ml-2" />
                        </Button>
                    </TooltipTrigger>
                     {batch.isCancelled && batch.cancellationReason && (
                        <TooltipContent>
                            <p>{batch.cancellationReason}</p>
                        </TooltipContent>
                     )}
                </Tooltip>
             </TooltipProvider>
          ) : (
            <Link href={`/register/${batch.id}`} passHref className="w-full">
              <Button className="w-full">
                Register Now <ArrowRight className="ml-2" />
              </Button>
            </Link>
          )}
        </CardFooter>
    </Card>
  )
};

const TrainingsSection = ({ title, batches, isPastSection = false }: { title: string, batches: Batch[], isPastSection?: boolean }) => {
  if (batches.length === 0) return null;
  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-primary mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map(batch => <TrainingCard key={batch.id} batch={batch} isPast={isPastSection} />)}
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {[...Array(3)].map((_, i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-1/3" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        ))}
    </div>
);

export default function Home() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBatches() {
      setLoading(true);
      const fetchedBatches = await getBatches();
      setBatches(fetchedBatches);
      setLoading(false);
    }
    fetchBatches();
  }, []);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const ongoing = batches.filter(b => {
      if (!b.startDate || !b.startTime || !b.endTime) return false;
      const eventDate = new Date(b.startDate);
      eventDate.setHours(0,0,0,0);
      return eventDate.getTime() === today.getTime() && b.startTime <= currentTime && b.endTime > currentTime;
  });

  const upcoming = batches.filter(b => {
      if (!b.startDate) return false;
      const eventDate = new Date(b.startDate);
      eventDate.setHours(0,0,0,0);
      return eventDate > today || (eventDate.getTime() === today.getTime() && b.startTime > currentTime);
  });
  
  const past = batches.filter(b => {
    if (!b.startDate) return false; // Legacy batches with no date are considered past.
    const eventDate = new Date(b.startDate);
    eventDate.setHours(0,0,0,0);
    return eventDate < today || (eventDate.getTime() === today.getTime() && b.endTime <= currentTime);
  });
  
  const legacy = batches.filter(b => !b.startDate);

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-6xl relative">
        <div className="absolute top-0 right-0 flex gap-4">
            <Link href="/student-login" passHref>
                <Button variant="outline">Student Login</Button>
            </Link>
            <Link href="/login" passHref>
                <Button variant="link">Admin/Trainer Login</Button>
            </Link>
        </div>

        <div className="flex flex-col items-center justify-center text-center pt-16 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
              BSA Training Academy, Pune
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Register for our ongoing and upcoming training sessions.
            </p>
        </div>
        
        <div className="flex flex-col items-center gap-12 w-full">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <TrainingsSection title="Ongoing Trainings" batches={ongoing} />
              <TrainingsSection title="Upcoming Trainings" batches={upcoming} />
              <TrainingsSection title="Past Trainings" batches={past} isPastSection={true} />
              <TrainingsSection title="Legacy Registrations" batches={legacy} isPastSection={true} />
              {batches.length === 0 && !loading && <p>No training sessions found.</p>}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
