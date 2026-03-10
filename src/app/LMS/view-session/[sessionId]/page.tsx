
"use client";

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getRecordedSessionById, markLessonAsComplete, getParticipantByIitpNo, startLesson } from '@/app/actions';
import type { RecordedSession, Participant } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Video } from 'lucide-react';
import { TraineeLoginForm } from '@/components/features/trainee-login-form';
import { VideoPlayer } from '@/components/features/video-player';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ViewRecordedSessionPage() {
    const { sessionId } = useParams() as { sessionId: string };
    
    const [session, setSession] = useState<RecordedSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [participant, setParticipant] = useState<Participant | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        const fetchSession = async () => {
            setLoading(true);
            const sessionData = await getRecordedSessionById(sessionId);
            if (!sessionData) {
                notFound();
            } else {
                setSession(sessionData);
            }
            setLoading(false);
        };
        fetchSession();
    }, [sessionId]);

    const handleLoginSuccess = async (iitpNo: string) => {
        const participantData = await getParticipantByIitpNo(iitpNo);
        if (!participantData) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not retrieve participant details after login.'
            });
            return;
        }

        // Mark attendance/viewership by treating the session ID as a lesson ID
        await startLesson({ participantId: participantData.id, lessonId: sessionId });
        await markLessonAsComplete({ participantId: participantData.id, lessonId: sessionId });
        
        setParticipant(participantData);
        setIsAuthenticated(true);
        toast({
            title: 'Access Granted',
            description: `Welcome, ${participantData.name}. You can now view the session.`
        });
    };

    if (loading) {
        return (
            <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </main>
        );
    }
    
    if (!session) {
        notFound();
    }

    return (
        <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-screen">
             <div className="w-full max-w-4xl">
                <div className="flex flex-col items-center justify-center text-center mb-8">
                    <p className="text-xl font-bold text-primary tracking-tight">
                        Recorded Session
                    </p>
                    <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight">
                        {session.title}
                    </h1>
                    {session.description && (
                        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                            {session.description}
                        </p>
                    )}
                </div>
                
                {isAuthenticated ? (
                    <Card>
                        <CardContent className="p-0 overflow-hidden">
                             <VideoPlayer url={session.videoUrl} />
                        </CardContent>
                        <CardFooter className="p-4 bg-secondary">
                             <p className="text-sm text-muted-foreground">Your view for this session has been recorded.</p>
                        </CardFooter>
                    </Card>
                ) : (
                    <Card className="max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle>Verify to Watch</CardTitle>
                            <CardDescription>Enter your IITP No. to view this recording. Your attendance will be marked.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TraineeLoginForm onSuccess={handleLoginSuccess} />
                        </CardContent>
                    </Card>
                )}
                 <div className="text-center mt-8">
                    <Button asChild variant="link">
                        <Link href="/login">
                           Back to Login
                        </Link>
                    </Button>
                </div>
            </div>
        </main>
    );
}
