
import Image from 'next/image';
import { getBatches } from '@/app/actions';
import type { Batch } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

const TrainingCard = ({ batch }: { batch: Batch }) => {
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
            {/* You can add more content here if needed */}
        </CardContent>
        <CardFooter>
            <Link href={`/register/${batch.id}`} passHref className="w-full">
              <Button className="w-full">
                Register Now <ArrowRight className="ml-2" />
              </Button>
            </Link>
        </CardFooter>
    </Card>
  )
};


export default async function Home2Page() {
  const allBatches = await getBatches();
  const recentBatches = allBatches.slice(0, 3);

  return (
    <main>
      <section className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center text-white">
        {/* Background Image */}
        <Image
          src="https://picsum.photos/seed/tech/1600/600"
          alt="Hero background"
          fill
          className="object-cover"
          data-ai-hint="technology abstract"
          priority
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content */}
        <div className="relative z-10 text-center p-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Innovate, Learn, Excel
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto">
            Welcome to the future of training. Explore our courses and unlock your potential.
          </p>
        </div>
      </section>

      <section className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Latest Training Sessions</h2>
          <Button asChild variant="outline">
            <Link href="/home">
              View All Trainings <ArrowRight className="ml-2"/>
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentBatches.map(batch => (
                <TrainingCard key={batch.id} batch={batch} />
            ))}
        </div>
        {recentBatches.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <p>No recent training sessions found.</p>
          </div>
        )}
      </section>
    </main>
  );
}
