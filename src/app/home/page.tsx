
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, Clock, Users, XCircle, Megaphone, Loader2 } from 'lucide-react';
import type { Batch } from '@/lib/types';
import { getBatches, getSiteConfig } from '../actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


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
                           {batch.isCancelled ? 'Cancelled' : 'View Details'} { !batch.isCancelled && <ArrowRight className="ml-2" /> }
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

const TrainingsSection = ({ title, batches, isPastSection = false, isLoading }: { title: string, batches?: Batch[], isPastSection?: boolean, isLoading?: boolean }) => {
  if (isLoading) {
      return (
          <div className="w-full">
            <h2 className="text-2xl font-semibold text-primary mb-4">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-2/4 mb-2" />
                            <Skeleton className="h-7 w-3/4" />
                            <Skeleton className="h-5 w-full mt-1" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-5 w-1/3" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
      )
  }
  if (!batches || batches.length === 0) return null;

  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-primary mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map(batch => <TrainingCard key={batch.id} batch={batch} isPast={isPastSection} />)}
      </div>
    </div>
  );
};

export default function Home() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAllPast, setShowAllPast] = useState(false);
  
  useEffect(() => {
    async function fetchData() {
        setLoading(true);
        const [fetchedBatches, siteConfig] = await Promise.all([
            getBatches(),
            getSiteConfig()
        ]);
        setBatches(fetchedBatches);
        setAnnouncement(siteConfig.announcement);
        setLoading(false);
    }
    fetchData();
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
  }).sort((a, b) => new Date(b.startDate).getTime() - new Date(b.startDate).getTime());
  
  const legacy = batches.filter(b => !b.startDate);

  const displayedPast = showAllPast ? past : past.slice(0, 6);

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-6xl relative">
        <div className="flex flex-col items-center justify-center text-center pt-16 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
              BSA Edutech India Pvt. Ltd.
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Register for our ongoing and upcoming training sessions.
            </p>
        </div>
        
        {loading ? (
             <Skeleton className="h-20 w-full mb-12" />
        ) : (
            announcement && (
                <Alert className="mb-12 bg-secondary">
                    <Megaphone className="h-4 w-4" />
                    <AlertTitle>Announcements & Notices</AlertTitle>
                    <AlertDescription>
                        {announcement}
                    </AlertDescription>
                </Alert>
            )
        )}


        <div className="flex flex-col items-center gap-12 w-full">
            <TrainingsSection title="Ongoing Trainings" batches={ongoing} isLoading={loading} />
            <TrainingsSection title="Upcoming Trainings" batches={upcoming} isLoading={loading} />
            <TrainingsSection title="Past Trainings" batches={displayedPast} isPastSection={true} isLoading={loading} />
             {!loading && past.length > 6 && !showAllPast && (
                <div className="w-full text-center -mt-6">
                    <Button variant="secondary" onClick={() => setShowAllPast(true)}>
                        Show All Past Trainings
                    </Button>
                </div>
            )}
            <TrainingsSection title="Legacy Registrations" batches={legacy} isPastSection={true} isLoading={loading}/>
            {!loading && batches.length === 0 && <p>No training sessions found.</p>}
        </div>
      </div>
    </main>
  );
}
