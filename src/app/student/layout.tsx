
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { getParticipantByIitpNo } from '@/app/actions';
import type { Participant } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const iitpNo = params.iitpNo as string;
  const [participant, setParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    if(iitpNo) {
      const fetchParticipant = async () => {
        const data = await getParticipantByIitpNo(iitpNo);
        setParticipant(data);
      }
      fetchParticipant();
    }
  }, [iitpNo]);

  const isExamPage = pathname.includes('/student/exam/');

  return (
    <div className="min-h-screen flex flex-col">
      {!isExamPage && (
        <header className="bg-background border-b sticky top-0 z-10">
          <nav className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold text-primary">
              BSA Training Academy, Pune
            </Link>
            <div className="flex items-center gap-4">
              {participant ? (
                  <span className="text-sm font-medium text-muted-foreground hidden sm:block">Welcome, {participant.name}</span>
              ) : (
                  iitpNo && <Skeleton className="h-5 w-32 hidden sm:block" />
              )}
              <Button variant="outline" asChild>
                <Link href="/">Logout</Link>
              </Button>
            </div>
          </nav>
        </header>
      )}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}
