
"use client";

import { useEffect, useState } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import type { Participant } from '@/lib/types';
import { getParticipantByIitpNo, generateAppointmentLetter } from '@/app/actions';
import { Loader2, ChevronLeft, FileText, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function AppointmentLetterPage() {
    const router = useRouter();
    const { iitpNo } = useParams() as { iitpNo: string };
    
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const participantData = await getParticipantByIitpNo(iitpNo);
                
                if (!participantData) {
                    notFound();
                    return;
                }
                setParticipant(participantData);
            } catch (error) {
                console.error("Failed to fetch participant data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (iitpNo) {
            fetchData();
        }
    }, [iitpNo]);

    const handleGenerate = async () => {
        if (!participant) return;

        setIsGenerating(true);
        setGeneratedUrl(null);
        const result = await generateAppointmentLetter(participant.id);
        setIsGenerating(false);

        if (result.success && result.docUrl) {
            toast({
                title: "Letter Generated Successfully!",
                description: "You can now view the document.",
            });
            setGeneratedUrl(result.docUrl);
        } else {
            toast({
                variant: 'destructive',
                title: "Generation Failed",
                description: result.error || "An unknown error occurred.",
            });
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    if (!participant) {
        return notFound();
    }

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/admin/users">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to User Directory
                    </Link>
                </Button>
            </div>
            
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Issue Appointment Letter</CardTitle>
                    <CardDescription>Generate a new appointment letter for {participant.name}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertTitle>Review Details Before Generating</AlertTitle>
                        <AlertDescription>
                           <p>The letter will be populated with the following details from the participant's profile:</p>
                           <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
                               <li><strong>Name:</strong> {participant.name}</li>
                               <li><strong>Address:</strong> {participant.address || 'Not Provided'}</li>
                               <li><strong>Designation:</strong> {participant.designation || 'Not Provided'}</li>
                               <li><strong>Joining Date:</strong> {participant.dateOfEntryIntoService ? new Date(participant.dateOfEntryIntoService).toLocaleDateString() : 'Not Provided'}</li>
                               <li><strong>Stipend:</strong> {participant.stipend ? `₹${participant.stipend}` : 'Not Provided'}</li>
                           </ul>
                           <p className="mt-2">If any details are incorrect, please <Link href={`/admin/users/${iitpNo}/edit`} className="underline">edit the participant's profile</Link> before proceeding.</p>
                        </AlertDescription>
                    </Alert>
                    
                    {generatedUrl && (
                        <Alert variant="default" className="bg-green-50 border-green-200">
                             <Download className="h-4 w-4" />
                            <AlertTitle>Document Ready</AlertTitle>
                            <AlertDescription>
                                Your document has been generated.
                                <Button asChild variant="secondary" size="sm" className="ml-4">
                                    <Link href={generatedUrl} target="_blank">
                                        View Document <ExternalLink className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleGenerate} disabled={isGenerating || !participant} className="w-full">
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Generating...</> : 'Generate Letter'}
                    </Button>
                </CardFooter>
            </Card>
        </main>
    )
}
