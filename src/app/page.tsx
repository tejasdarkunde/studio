
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Video } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Batch } from '@/lib/types';
import { getBatches } from './actions';
import { Skeleton } from '@/components/ui/skeleton';

const TrainingCard = ({ batch }: { batch: Batch }) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const isPast = new Date(batch.endDate) < new Date();

  return (
    <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>{batch.name}</CardTitle>
          <CardDescription className="flex items-center gap-2 pt-1">
            <Calendar className="h-4 w-4" /> 
            {formatDate(batch.startDate)} - {formatDate(batch.endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-end">
          <Link href={`/register/${batch.id}`} passHref>
            <Button className="w-full" disabled={isPast}>
              {isPast ? 'View Details' : 'Register Now'} <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </CardContent>
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
  const ongoing = batches.filter(b => new Date(b.startDate) <= now && new Date(b.endDate) >= now);
  const upcoming = batches.filter(b => new Date(b.startDate) > now);
  const past = batches.filter(b => new Date(b.endDate) < now);

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
