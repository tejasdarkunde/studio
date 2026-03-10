
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Video } from 'lucide-react';

export default function RecordedSessionsPage() {
  return (
    <div>
      <div className="mb-8">
        <Button asChild variant="outline">
          <Link href="/LMS/admin">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to LMS Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recorded Sessions</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Manage and upload recorded training sessions.
          </p>
        </div>
        <Button disabled>
          <Video className="mr-2 h-4 w-4" /> Upload New Recording
        </Button>
      </div>
      
      <Card className="text-center py-16 text-muted-foreground border-2 border-dashed">
        <CardContent>
            <h3 className="text-xl font-semibold">Feature Coming Soon</h3>
            <p className="mt-2">The ability to upload and manage recorded sessions is under construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}
