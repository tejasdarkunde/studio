
"use client";

import { useEffect, useState } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import type { Participant, Course } from '@/lib/types';
import { getParticipantByIitpNo, getCourses } from '@/app/actions';
import { Loader2, ChevronLeft, User, Building, Mail, Phone, Calendar, GraduationCap, Briefcase, Banknote, Shield, BookOpen, FileQuestion, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | number | null }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
                <p className="text-sm font-semibold text-muted-foreground">{label}</p>
                <p className="text-base">{value}</p>
            </div>
        </div>
    )
}

export default function AdminTraineeProfilePage() {
    const router = useRouter();
    const { iitpNo } = useParams() as { iitpNo: string };
    
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [participantData, coursesData] = await Promise.all([
                    getParticipantByIitpNo(iitpNo, undefined),
                    getCourses()
                ]);
                
                if (!participantData) {
                    notFound();
                    return;
                }
                setParticipant(participantData);
                setCourses(coursesData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (iitpNo) {
            fetchData();
        }
    }, [iitpNo]);

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
    
    const enrolledCourses = courses.filter(c => participant.enrolledCourses?.includes(c.name));

    return (
        <main className="pb-12">
            <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/admin/users">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to User Directory
                    </Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <User className="h-8 w-8 text-primary" />
                                {participant.name}
                            </CardTitle>
                            <CardDescription>
                                IITP No: {participant.iitpNo}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <InfoItem icon={Building} label="Organization" value={participant.organization} />
                            <InfoItem icon={Mail} label="Email" value={participant.email} />
                            <InfoItem icon={Phone} label="Mobile" value={participant.mobile} />
                            <InfoItem icon={Calendar} label="Date of Birth" value={participant.birthDate ? new Date(participant.birthDate).toLocaleDateString() : ''} />
                            <InfoItem icon={User} label="Sex" value={participant.sex} />
                             <InfoItem icon={LogOut} label="Left Date" value={participant.leftDate ? new Date(participant.leftDate).toLocaleDateString() : ''} />
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Professional Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <InfoItem icon={GraduationCap} label="Qualification" value={participant.qualification} />
                            <InfoItem icon={Briefcase} label="Designation" value={participant.designation} />
                            <InfoItem icon={Calendar} label="Date of Entry into Service" value={participant.dateOfEntryIntoService ? new Date(participant.dateOfEntryIntoService).toLocaleDateString() : ''} />
                            <InfoItem icon={Banknote} label="Stipend" value={participant.stipend ? `₹${participant.stipend.toLocaleString()}`: ''} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Identity & Bank Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <InfoItem icon={Shield} label="Aadhar No" value={participant.aadharCardNo} />
                            <InfoItem icon={Shield} label="PAN Card No" value={participant.panCardNo} />
                             <Separator />
                            <InfoItem icon={Briefcase} label="Bank Name" value={participant.bankName} />
                            <InfoItem icon={Briefcase} label="Account No" value={participant.bankAccountNo} />
                            <InfoItem icon={Briefcase} label="IFSC Code" value={participant.ifscCode} />
                        </CardContent>
                    </Card>

                </div>
                 <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Enrolled Courses & Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {enrolledCourses.length > 0 ? enrolledCourses.map(course => {
                                const allLessonIds = course.subjects.flatMap(s => s.units.flatMap(u => u.lessons.map(l => l.id)));
                                const totalLessons = allLessonIds.length;
                                const completedCount = allLessonIds.filter(id => participant.completedLessons?.includes(id)).length;
                                const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

                                return (
                                    <div key={course.id} className="p-4 border rounded-lg">
                                        <h3 className="font-semibold text-lg">{course.name}</h3>
                                        {totalLessons > 0 ? (
                                            <div className="mt-2 space-y-2">
                                                <Progress value={percentage} />
                                                <p className="text-sm text-muted-foreground">{completedCount} of {totalLessons} lessons completed ({percentage}%)</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground mt-2">No lessons in this course yet.</p>
                                        )}
                                    </div>
                                )
                           }) : <p className="text-muted-foreground">Not enrolled in any courses.</p>}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Exam Attempts</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {participant.examProgress && Object.keys(participant.examProgress).length > 0 ? (
                                Object.entries(participant.examProgress).map(([examId, attempt]) => {
                                    const exam = courses.flatMap(c => c.exams || []).find(e => e.id === examId);
                                    if (!exam || !attempt.isSubmitted) return null;
                                    
                                    const totalGradable = exam.questions.filter(q => q.type !== 'paragraph').length;

                                    return (
                                        <div key={examId} className="p-4 border rounded-lg flex justify-between items-center">
                                            <div>
                                                <h4 className="font-semibold">{exam.title}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Score: <span className="font-bold text-primary">{attempt.score} / {totalGradable}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Submitted: {new Date(attempt.submittedAt!).toLocaleString()}
                                                </p>
                                            </div>
                                            <Button asChild variant="secondary" size="sm">
                                                 <Link href={`/student/results/${iitpNo}/${examId}`}>View Details</Link>
                                            </Button>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-muted-foreground">No exam attempts found.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    )
}
