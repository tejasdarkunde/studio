
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import type { Participant, Course, Organization, OrganizationAdmin } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronLeft } from 'lucide-react';
import { getCourses, getOrganizations, addParticipant } from '@/app/actions';
import Link from 'next/link';


export default function AddParticipantPage() {
    const params = useParams();
    const router = useRouter();
    const organizationName = decodeURIComponent(params.organizationName as string);

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [iitpNo, setIitpNo] = useState('');
    const [mobile, setMobile] = useState('');
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [year, setYear] = useState('');
    const [semester, setSemester] = useState('');
    const [enrollmentSeason, setEnrollmentSeason] = useState<'Summer' | 'Winter' | undefined>();
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const role = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (role === 'organization-admin' && userJson) {
            const user = JSON.parse(userJson) as OrganizationAdmin;
            if (user.organizationName !== organizationName) {
                 router.push('/login');
                 return;
            }
        } else {
            router.push('/login');
            return;
        }

        async function fetchData() {
            const [fetchedCourses] = await Promise.all([
                getCourses(),
            ]);
            setCourses(fetchedCourses);
            setLoading(false);
        }
        fetchData();
    }, [organizationName, router]);


    const handleSave = async () => {
        if (!name.trim() || !iitpNo.trim()) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Name and IITP No. fields are required.",
            });
          return;
        }
        
        setIsSaving(true);
        const result = await addParticipant({
            name, iitpNo, mobile, 
            organization: organizationName, 
            enrolledCourses: selectedCourses, 
            year, 
            semester, 
            enrollmentSeason
        });

        if (result.success) {
            toast({
                title: "Participant Added",
                description: `${name} has been added successfully.`
            });
            router.push(`/organization/${organizationName}/participants`);
        } else {
            toast({
                variant: "destructive",
                title: "Error Adding Participant",
                description: result.error,
            });
            setIsSaving(false);
        }
    };
  
    const handleCourseToggle = (courseName: string) => {
        setSelectedCourses(prev => 
            prev.includes(courseName) 
                ? prev.filter(c => c !== courseName) 
                : [...prev, courseName]
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <>
            <div className="mb-8">
                <Button asChild variant="outline">
                    <Link href={`/organization/${organizationName}/participants`}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Participants
                    </Link>
                </Button>
            </div>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Add New Participant</CardTitle>
                    <CardDescription>Enter the details for the new participant for {organizationName}.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name *</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="iitpNo" className="text-right">IITP No *</Label>
                        <Input id="iitpNo" value={iitpNo} onChange={(e) => setIitpNo(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="mobile" className="text-right">Mobile No</Label>
                        <Input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="organization" className="text-right">Organization</Label>
                        <Input id="organization" value={organizationName} disabled className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="year" className="text-right">Year</Label>
                        <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} className="col-span-3" placeholder="e.g., 2024" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="semester" className="text-right">Semester</Label>
                        <Input id="semester" value={semester} onChange={(e) => setSemester(e.target.value)} className="col-span-3" placeholder="e.g., 1st" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="enrollmentSeason" className="text-right">Enrollment</Label>
                        <Select onValueChange={(value: 'Summer' | 'Winter') => setEnrollmentSeason(value)} value={enrollmentSeason}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select season" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Summer">Summer</SelectItem>
                                <SelectItem value="Winter">Winter</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Enrolled Courses</Label>
                        <ScrollArea className="h-32 w-full col-span-3 rounded-md border p-2">
                            <div className="space-y-2">
                                {courses.map(course => (
                                    <div key={course.id} className="flex items-center gap-2">
                                        <Checkbox 
                                            id={`course-${course.id}`}
                                            checked={selectedCourses.includes(course.name)}
                                            onCheckedChange={() => handleCourseToggle(course.name)}
                                        />
                                        <Label htmlFor={`course-${course.id}`} className="font-normal">{course.name}</Label>
                                    </div>
                                ))}
                                {courses.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center">No courses found.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Adding...</> : 'Add Participant'}
                    </Button>
                </CardFooter>
            </Card>
        </>
    )
}
