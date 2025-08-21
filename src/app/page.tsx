
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Clock, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Batch } from '@/lib/types';
import { getBatches } from './actions';
import { Skeleton } from '@/components/ui/skeleton';

const TrainingCard = ({ batch }: { batch: Batch }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not set';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  const isPastEvent = () => {
    if (batch.endDate) { // Handle old data model
      return new Date(batch.endDate) < new Date();
    }
    if (batch.startDate) { // New model: single day event
      const eventDate = new Date(batch.startDate);
      const today = new Date();
      today.setHours(0,0,0,0); // Compare dates only
      eventDate.setHours(0,0,0,0);
      return eventDate < today;
    }
    return false; // No date info, assume not past
  }

  const isPast = isPastEvent();

  return (
    <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>{batch.name}</CardTitle>
          <CardDescription className="flex items-center gap-2 pt-1">
            {batch.startDate ? (
              <>
                <Calendar className="h-4 w-4" /> 
                <span>{formatDate(batch.startDate)}</span>
                {batch.time && (
                  <>
                    <Clock className="h-4 w-4 ml-2" />
                    <span>{batch.time}</span>
                  </>
                )}
                {batch.endDate && !batch.time && (
                   <span> - {formatDate(batch.endDate)}</span>
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
          <Link href={`/register/${batch.id}`} passHref>
            <Button className="w-full" disabled={isPast}>
              {isPast ? 'View Details' : 'Register Now'} <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </CardFooter>
    </Card>
  )
};

const TrainingsSection = ({ title, batches }: { title: string, batches: Batch[] }) => {
  if (batches.length === 0) return null;
  return (
    <div className="w-full">
      <h2 className="text-2xl font-semibold text-primary mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map(batch => <TrainingCard key={batch.id} batch={batch} />)}
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
                    <Skeleton className="h-4 w-1/3 mb-4" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
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

  const getEventDate = (b: Batch) => new Date(new Date(b.startDate).getFullYear(), new Date(b.startDate).getMonth(), new Date(b.startDate).getDate());

  const ongoing = batches.filter(b => {
      if (!b.startDate) return false;
      if (b.endDate) { // Legacy multi-day events
          return new Date(b.startDate) <= now && new Date(b.endDate) >= now;
      }
      // Single-day events are "ongoing" on that day
      return getEventDate(b).getTime() === today.getTime();
  });

  const upcoming = batches.filter(b => {
      if (!b.startDate) return false;
      // Exclude ongoing events from upcoming
      if (ongoing.some(ongoingBatch => ongoingBatch.id === b.id)) return false;
      return getEventDate(b) > today;
  });
  
  const past = batches.filter(b => {
    if (!b.startDate) return false;
    if (b.endDate) { // Legacy multi-day events
      return new Date(b.endDate) < now;
    }
    // Single-day events are "past" the day after
    return getEventDate(b) < today;
  });

  const legacy = batches.filter(b => !b.startDate);


  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-6xl">
        <div className="flex flex-col items-center justify-center text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
              Training Programs
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
              <TrainingsSection title="Legacy Registrations" batches={legacy} />
              <TrainingsSection title="Past Trainings" batches={past} />
              {batches.length === 0 && !loading && <p>No training sessions found.</p>}
            </>
          )}
        </div>

        <div className="text-center mt-16">
            <Link href="/admin" passHref>
                <Button variant="link">Admin Access</Button>
            </Link>
        </div>
      </div>
    </main>
  );
}
