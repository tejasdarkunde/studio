
"use client";

import { useEffect, useState } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import type { Participant, Course, Organization } from '@/lib/types';
import { getParticipantByIitpNo, getCourses, updateParticipant, getOrganizations } from '@/app/actions';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

const enrollmentSchemes = ["NEEM", "NAPS", "NATS", "MSBTE", "ASDC"];

export default function EditTraineePage() {
    const router = useRouter();
    const { iitpNo } = useParams() as { iitpNo: string };
    
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [formData, setFormData] = useState<Partial<Participant>>({});
    const [courses, setCourses] = useState<Course[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [participantData, coursesData, orgsData] = await Promise.all([
                    getParticipantByIitpNo(iitpNo, undefined),
                    getCourses(),
                    getOrganizations(),
                ]);
                
                if (!participantData) {
                    notFound();
                    return;
                }
                setParticipant(participantData);
                setFormData(participantData);
                setCourses(coursesData);
                setOrganizations(orgsData);
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    }

    const handleSelectChange = (id: keyof Participant, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    }

    const handleCourseToggle = (courseName: string) => {
        setFormData(prev => {
            const currentCourses = prev.enrolledCourses || [];
            const newCourses = currentCourses.includes(courseName)
                ? currentCourses.filter(c => c !== courseName)
                : [...currentCourses, courseName];
            return { ...prev, enrolledCourses: newCourses };
        });
    }

    const handleSchemeChange = (scheme: string, checked: boolean) => {
        setFormData(prev => {
            const currentSchemes = prev.enrollmentScheme || [];
            const newSchemes = checked
                ? [...currentSchemes, scheme]
                : currentSchemes.filter(s => s !== scheme && s !== `Other: ${(prev as any).otherSchemeText}`);
            
            if (scheme === 'Other' && !checked) {
                return { ...prev, enrollmentScheme: newSchemes, otherSchemeText: '' };
            }

            return { ...prev, enrollmentScheme: newSchemes };
        });
    };
    
    const handleOtherSchemeTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setFormData(prev => {
            const otherValue = `Other: ${text}`;
            // remove old "Other: " value and add new one
            const newSchemes = prev.enrollmentScheme?.filter(s => !s.startsWith("Other:")) || [];
            if (text) {
                newSchemes.push(otherValue);
            }
             // Also manage the 'Other' checkbox itself
            const finalSchemes = text ? Array.from(new Set([...newSchemes, 'Other'])) : newSchemes.filter(s => s !== 'Other');

            return { ...prev, otherSchemeText: text, enrollmentScheme: finalSchemes };
        });
    };
    
    const handleSave = async () => {
        if (!participant) return;

        setIsSaving(true);
        const result = await updateParticipant({
          ...formData,
          id: participant.id
        } as Participant);

        if (result.success) {
            toast({
                title: "Trainee Updated",
                description: `Details for ${formData.name} have been saved.`,
            });
            router.push(`/supervisor/trainees`);
        } else {
            toast({
                variant: 'destructive',
                title: "Update Failed",
                description: result.error,
            });
        }
        setIsSaving(false);
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
        <main className="pb-12">
            <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/supervisor/trainees">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to All Trainees
                    </Link>
                </Button>
            </div>
            
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Edit Trainee Details</CardTitle>
                    <CardDescription>Update the admission form for {participant.name}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="iitpNo">IITP No *</Label>
                            <Input id="iitpNo" value={formData.iitpNo} onChange={handleInputChange} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input id="name" value={formData.name} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="fatherOrHusbandName">Father/Husband Name</Label>
                            <Input id="fatherOrHusbandName" value={formData.fatherOrHusbandName} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={formData.email} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile No</Label>
                            <Input id="mobile" value={formData.mobile} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="birthDate">Date of Birth</Label>
                            <Input id="birthDate" type="date" value={formData.birthDate ? new Date(formData.birthDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sex">Sex</Label>
                             <Select onValueChange={(value) => handleSelectChange('sex', value)} value={formData.sex}>
                                <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="organization">Organization *</Label>
                            <Select onValueChange={(value) => handleSelectChange('organization', value)} value={formData.organization}>
                                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                                <SelectContent>
                                    {organizations.map(org => <SelectItem key={org.id} value={org.name}>{org.name}</SelectItem>)}
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" value={formData.address} onChange={handleInputChange} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="aadharCardNo">Aadhar Card No</Label>
                            <Input id="aadharCardNo" value={formData.aadharCardNo} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="panCardNo">PAN Card No</Label>
                            <Input id="panCardNo" value={formData.panCardNo} onChange={handleInputChange} />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input id="bankName" value={formData.bankName} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bankAccountNo">Bank Account No</Label>
                            <Input id="bankAccountNo" value={formData.bankAccountNo} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ifscCode">IFSC Code</Label>
                            <Input id="ifscCode" value={formData.ifscCode} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="qualification">Qualification</Label>
                            <Input id="qualification" value={formData.qualification} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="passOutYear">Pass-out Year</Label>
                            <Input id="passOutYear" value={formData.passOutYear} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="designation">Designation</Label>
                            <Input id="designation" value={formData.designation} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="dateOfEntryIntoService">Date of Entry into Service</Label>
                            <Input id="dateOfEntryIntoService" type="date" value={formData.dateOfEntryIntoService ? new Date(formData.dateOfEntryIntoService).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="stipend">Stipend</Label>
                            <Input id="stipend" type="number" value={formData.stipend || ''} onChange={(e) => setFormData(prev => ({...prev, stipend: e.target.value ? Number(e.target.value) : undefined}))} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="leftDate">Left Date</Label>
                            <Input id="leftDate" type="date" value={formData.leftDate ? new Date(formData.leftDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="year">Year</Label>
                            <Input id="year" value={formData.year} onChange={handleInputChange} placeholder="e.g., 2024" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="semester">Semester</Label>
                            <Input id="semester" value={formData.semester} onChange={handleInputChange} placeholder="e.g., 1st" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="enrollmentSeason">Enrollment</Label>
                            <Select onValueChange={(value: 'Summer' | 'Winter') => handleSelectChange('enrollmentSeason', value)} value={formData.enrollmentSeason}>
                                <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Summer">Summer</SelectItem>
                                    <SelectItem value="Winter">Winter</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <Label>Enrollment Scheme</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {enrollmentSchemes.map(scheme => (
                                <div key={scheme} className="flex items-center gap-2">
                                    <Checkbox 
                                        id={`scheme-${scheme}`}
                                        checked={formData.enrollmentScheme?.includes(scheme)}
                                        onCheckedChange={(checked) => handleSchemeChange(scheme, !!checked)}
                                    />
                                    <Label htmlFor={`scheme-${scheme}`} className="font-normal">{scheme}</Label>
                                </div>
                            ))}
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="scheme-other"
                                    checked={formData.enrollmentScheme?.includes('Other')}
                                    onCheckedChange={(checked) => handleSchemeChange('Other', !!checked)}
                                />
                                <Label htmlFor="scheme-other" className="font-normal">Other</Label>
                            </div>
                        </div>
                        {formData.enrollmentScheme?.includes('Other') && (
                            <div className="pl-4">
                                <Input 
                                    placeholder="Please specify other scheme"
                                    value={(formData as any).otherSchemeText || ''}
                                    onChange={handleOtherSchemeTextChange}
                                />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Courses of Interest</Label>
                        <ScrollArea className="h-32 w-full rounded-md border p-2">
                            <div className="space-y-2">
                                {courses.map(course => (
                                    <div key={course.id} className="flex items-center gap-2">
                                        <Checkbox 
                                            id={`course-${course.id}`}
                                            checked={formData.enrolledCourses?.includes(course.name)}
                                            onCheckedChange={() => handleCourseToggle(course.name)}
                                        />
                                        <Label htmlFor={`course-${course.id}`} className="font-normal">{course.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" asChild>
                       <Link href={`/supervisor/trainees/${iitpNo}`}>Cancel</Link>
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Changes'}
                    </Button>
                </CardFooter>
            </Card>
        </main>
    )
}

    