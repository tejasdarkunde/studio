

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import type { Participant, Course, Organization } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronLeft, Search } from 'lucide-react';
import { getCourses, getOrganizations, addParticipant, getParticipantByIitpNo, updateParticipant } from '@/app/actions';
import Link from 'next/link';
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const enrollmentSchemes = ["NEEM", "NAPS", "NATS", "MSBTE", "ASDC"];

export default function ApplyPage() {
    const router = useRouter();

    const [courses, setCourses] = useState<Course[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [existingParticipantId, setExistingParticipantId] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<Omit<Participant, 'id' | 'createdAt'>> & { otherSchemeText?: string }>({
        name: '',
        iitpNo: '',
        mobile: '',
        organization: '',
        enrolledCourses: [],
        year: '',
        semester: '',
        fatherOrHusbandName: '',
        birthDate: '',
        aadharCardNo: '',
        panCardNo: '',
        bankName: '',
        bankAccountNo: '',
        ifscCode: '',
        email: '',
        qualification: '',
        passOutYear: '',
        dateOfEntryIntoService: '',
        address: '',
        designation: '',
        leftDate: '',
        enrollmentScheme: '',
        otherSchemeText: '',
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchData() {
            const [fetchedCourses, fetchedOrganizations] = await Promise.all([
                getCourses(),
                getOrganizations(),
            ]);
            setCourses(fetchedCourses);
            setOrganizations(fetchedOrganizations);
            setLoading(false);
        }
        fetchData();
    }, []);


    const handleSave = async () => {
        if (!formData.name?.trim() || !formData.iitpNo?.trim()) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Name, IITP No., and Organization fields are required.",
            });
          return;
        }
        
        setIsSaving(true);

        const dataToSave = { ...formData };
        if (formData.enrollmentScheme === 'Other' && formData.otherSchemeText) {
            dataToSave.enrollmentScheme = `Other: ${formData.otherSchemeText}`;
        }
        delete dataToSave.otherSchemeText;

        const action = existingParticipantId ? updateParticipant : addParticipant;
        const payload = existingParticipantId 
            ? { ...dataToSave, id: existingParticipantId } 
            : dataToSave;
            
        const result = await action(payload as any);

        if (result.success) {
            toast({
                title: `Application ${existingParticipantId ? 'Updated' : 'Submitted'}!`,
                description: `Thank you, ${formData.name}. Your application has been received.`
            });
            // Reset form or redirect
             setFormData({
                name: '', iitpNo: '', mobile: '', organization: '', enrolledCourses: [],
                year: '', semester: '', fatherOrHusbandName: '', birthDate: '', aadharCardNo: '',
                panCardNo: '', bankName: '', bankAccountNo: '', ifscCode: '', email: '',
                qualification: '', passOutYear: '', dateOfEntryIntoService: '', address: '', designation: '',
                leftDate: '', enrollmentScheme: '', otherSchemeText: ''
            });
            setExistingParticipantId(null);
        } else {
            toast({
                variant: "destructive",
                title: "Error Submitting Application",
                description: result.error,
            });
        }
        setIsSaving(false);
    };
  
    const handleCourseToggle = (courseName: string) => {
        setFormData(prev => {
            const currentCourses = prev.enrolledCourses || [];
            const newCourses = currentCourses.includes(courseName)
                ? currentCourses.filter(c => c !== courseName)
                : [...currentCourses, courseName];
            return { ...prev, enrolledCourses: newCourses };
        });
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    }

    const handleSelectChange = (id: keyof Participant, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    }
    
    const handleSchemeChange = (value: string) => {
        setFormData(prev => ({ ...prev, enrollmentScheme: value, otherSchemeText: value === 'Other' ? prev.otherSchemeText : '' }));
    };
    
    const handleOtherSchemeTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setFormData(prev => ({ ...prev, otherSchemeText: text }));
    };

    const handleIitpNoBlur = async () => {
        if (!formData.iitpNo?.trim()) return;

        setIsFetching(true);
        const participant = await getParticipantByIitpNo(formData.iitpNo);
        setIsFetching(false);

        if (participant) {
            toast({
                title: "Participant Found",
                description: "Your details have been pre-filled. Please review and update if necessary.",
            });
            
            let schemeValue = participant.enrollmentScheme || '';
            let scheme = Array.isArray(schemeValue) ? schemeValue[0] || '' : schemeValue;
            let otherText = '';
            if (typeof scheme === 'string' && scheme.startsWith('Other: ')) {
                otherText = scheme.replace('Other: ', '');
                scheme = 'Other';
            }

            setFormData({
                name: participant.name || '',
                iitpNo: participant.iitpNo || '',
                mobile: participant.mobile || '',
                organization: participant.organization || '',
                enrolledCourses: participant.enrolledCourses || [],
                year: participant.year || '',
                semester: participant.semester || '',
                enrollmentSeason: participant.enrollmentSeason,
                fatherOrHusbandName: participant.fatherOrHusbandName || '',
                birthDate: participant.birthDate ? new Date(participant.birthDate).toISOString().split('T')[0] : '',
                aadharCardNo: participant.aadharCardNo || '',
                panCardNo: participant.panCardNo || '',
                bankName: participant.bankName || '',
                bankAccountNo: participant.bankAccountNo || '',
                ifscCode: participant.ifscCode || '',
                email: participant.email || '',
                sex: participant.sex,
                qualification: participant.qualification || '',
                passOutYear: participant.passOutYear || '',
                dateOfEntryIntoService: participant.dateOfEntryIntoService ? new Date(participant.dateOfEntryIntoService).toISOString().split('T')[0] : '',
                address: participant.address || '',
                designation: participant.designation || '',
                stipend: participant.stipend,
                leftDate: participant.leftDate ? new Date(participant.leftDate).toISOString().split('T')[0] : '',
                enrollmentScheme: scheme,
                otherSchemeText: otherText,
            });
            setExistingParticipantId(participant.id);
        } else {
            setExistingParticipantId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <Button asChild variant="outline">
                    <Link href={`/`}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Link>
                </Button>
            </div>
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>New Admission Form</CardTitle>
                    <CardDescription>Enter your details to apply for our training programs. If you have applied before, enter your IITP No. and we'll fetch your details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label htmlFor="iitpNo">IITP No *</Label>
                        <div className="flex gap-2 items-center">
                            <Input id="iitpNo" value={formData.iitpNo} onChange={handleInputChange} onBlur={handleIitpNoBlur} />
                            {isFetching && <Loader2 className="h-5 w-5 animate-spin" />}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <Input id="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} />
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
                                <SelectTrigger><SelectValue placeholder="Select your organization" /></SelectTrigger>
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
                            <Input id="dateOfEntryIntoService" type="date" value={formData.dateOfEntryIntoService} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stipend">Stipend</Label>
                            <Input id="stipend" type="number" value={formData.stipend || ''} onChange={(e) => setFormData(prev => ({...prev, stipend: e.target.value ? Number(e.target.value) : undefined}))} />
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
                        <RadioGroup value={formData.enrollmentScheme} onValueChange={handleSchemeChange} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {enrollmentSchemes.map(scheme => (
                                <div key={scheme} className="flex items-center gap-2">
                                    <RadioGroupItem value={scheme} id={`scheme-${scheme}`} />
                                    <Label htmlFor={`scheme-${scheme}`} className="font-normal">{scheme}</Label>
                                </div>
                            ))}
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="Other" id="scheme-other" />
                                <Label htmlFor="scheme-other" className="font-normal">Other</Label>
                            </div>
                        </RadioGroup>
                        {formData.enrollmentScheme === 'Other' && (
                            <div className="pl-4">
                                <Input 
                                    placeholder="Please specify other scheme"
                                    value={formData.otherSchemeText || ''}
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
                                {courses.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center">No courses found.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.push('/')} disabled={isSaving}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</> : (existingParticipantId ? 'Update Application' : 'Submit Application')}
                    </Button>
                </CardFooter>
            </Card>
        </main>
    )
}

    

    