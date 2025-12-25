
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Participant, Course, Organization, Supervisor } from '@/lib/types';
import { getCourses, getOrganizations, addParticipant, getParticipantByIitpNo, updateParticipant, getParticipantsByOrganization } from '@/app/actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const DirectoryTab = ({ participants }: { participants: Participant[] }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Trainee Directory</CardTitle>
                <CardDescription>
                    List of all trainees registered under your organization.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[60vh] border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>IITP No</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Enrolled Courses</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {participants.length > 0 ? (
                                participants.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.iitpNo}</TableCell>
                                        <TableCell>{p.mobile}</TableCell>
                                        <TableCell>{p.enrolledCourses?.join(', ') || 'None'}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No trainees found for your organization.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};


const AddUpdateTab = ({ 
    courses, 
    onParticipantAdded,
    supervisor
}: { 
    courses: Course[], 
    onParticipantAdded: () => void,
    supervisor: Supervisor | null
}) => {
    const [existingParticipantId, setExistingParticipantId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Omit<Participant, 'id' | 'createdAt'>>>({
        name: '', iitpNo: '', mobile: '', organization: supervisor?.organization || '', enrolledCourses: [], year: '',
        semester: '', fatherOrHusbandName: '', birthDate: '', aadharCardNo: '', panCardNo: '',
        bankName: '', bankAccountNo: '', ifscCode: '', email: '', qualification: '', passOutYear: '',
        dateOfEntryIntoService: '', address: '', designation: '',
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const { toast } = useToast();

     useEffect(() => {
        if(supervisor) {
            setFormData(prev => ({...prev, organization: supervisor.organization}))
        }
    }, [supervisor])

    const handleSave = async () => {
        if (!formData.name?.trim() || !formData.iitpNo?.trim()) {
            toast({ variant: "destructive", title: "Missing Information", description: "Name and IITP No. are required." });
            return;
        }
        
        setIsSaving(true);
        const action = existingParticipantId ? updateParticipant : addParticipant;
        const payload = existingParticipantId ? { ...formData, id: existingParticipantId } : { ...formData, organization: supervisor?.organization };
            
        const result = await action(payload as any);

        if (result.success) {
            toast({ title: `Application ${existingParticipantId ? 'Updated' : 'Submitted'}!`, description: `Application for ${formData.name} has been received.` });
            setFormData({ name: '', iitpNo: '', mobile: '', organization: supervisor?.organization, enrolledCourses: [], year: '', semester: '', fatherOrHusbandName: '', birthDate: '', aadharCardNo: '', panCardNo: '', bankName: '', bankAccountNo: '', ifscCode: '', email: '', qualification: '', passOutYear: '', dateOfEntryIntoService: '', address: '', designation: '' });
            setExistingParticipantId(null);
            onParticipantAdded(); // Callback to refresh the directory
        } else {
            toast({ variant: "destructive", title: "Error Submitting Application", description: result.error });
        }
        setIsSaving(false);
    };
  
    const handleCourseToggle = (courseName: string) => {
        setFormData(prev => {
            const currentCourses = prev.enrolledCourses || [];
            const newCourses = currentCourses.includes(courseName) ? currentCourses.filter(c => c !== courseName) : [...currentCourses, courseName];
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

    const handleIitpNoBlur = async () => {
        if (!formData.iitpNo?.trim()) return;

        setIsFetching(true);
        const participant = await getParticipantByIitpNo(formData.iitpNo, supervisor?.organization);
        setIsFetching(false);

        if (participant) {
            toast({ title: "Participant Found", description: "Details have been pre-filled. Please review and update." });
            setFormData({
                name: participant.name || '', iitpNo: participant.iitpNo || '', mobile: participant.mobile || '',
                organization: participant.organization || '', enrolledCourses: participant.enrolledCourses || [], year: participant.year || '',
                semester: participant.semester || '', enrollmentSeason: participant.enrollmentSeason, fatherOrHusbandName: participant.fatherOrHusbandName || '',
                birthDate: participant.birthDate ? new Date(participant.birthDate).toISOString().split('T')[0] : '', aadharCardNo: participant.aadharCardNo || '',
                panCardNo: participant.panCardNo || '', bankName: participant.bankName || '', bankAccountNo: participant.bankAccountNo || '',
                ifscCode: participant.ifscCode || '', email: participant.email || '', sex: participant.sex, qualification: participant.qualification || '',
                passOutYear: participant.passOutYear || '', dateOfEntryIntoService: participant.dateOfEntryIntoService ? new Date(participant.dateOfEntryIntoService).toISOString().split('T')[0] : '',
                address: participant.address || '', designation: participant.designation || '', stipend: participant.stipend,
            });
            setExistingParticipantId(participant.id);
        } else {
            toast({ variant: 'destructive', title: 'Not Found', description: `No participant with IITP No: ${formData.iitpNo} found in your organization.` });
            setExistingParticipantId(null);
            // Keep iitpNo and organization, clear other fields for new entry
            const iitpNo = formData.iitpNo;
            setFormData({ name: '', iitpNo: iitpNo, mobile: '', organization: supervisor?.organization, enrolledCourses: [], year: '', semester: '', fatherOrHusbandName: '', birthDate: '', aadharCardNo: '', panCardNo: '', bankName: '', bankAccountNo: '', ifscCode: '', email: '', qualification: '', passOutYear: '', dateOfEntryIntoService: '', address: '', designation: '' });

        }
    };
    
    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>{existingParticipantId ? 'Update Admission Form' : 'New Admission Form'}</CardTitle>
                <CardDescription>Enter student details. If they have applied before, their data will be pre-filled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="iitpNo">IITP No *</Label>
                    <div className="flex gap-2 items-center">
                        <Input id="iitpNo" value={formData.iitpNo} onChange={handleInputChange} onBlur={handleIitpNoBlur} />
                        {isFetching && <Loader2 className="h-5 w-5 animate-spin" />}
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="organization">Organization *</Label>
                    <Input id="organization" value={formData.organization} disabled />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"> <Label htmlFor="name">Name *</Label> <Input id="name" value={formData.name} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="fatherOrHusbandName">Father/Husband Name</Label> <Input id="fatherOrHusbandName" value={formData.fatherOrHusbandName} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="email">Email</Label> <Input id="email" type="email" value={formData.email} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="mobile">Mobile No</Label> <Input id="mobile" value={formData.mobile} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="birthDate">Date of Birth</Label> <Input id="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} /> </div>
                    <div className="space-y-2">
                        <Label htmlFor="sex">Sex</Label>
                         <Select onValueChange={(value) => handleSelectChange('sex', value)} value={formData.sex}>
                            <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                            <SelectContent> <SelectItem value="Male">Male</SelectItem> <SelectItem value="Female">Female</SelectItem> <SelectItem value="Other">Other</SelectItem> </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2"> <Label htmlFor="address">Address</Label> <Textarea id="address" value={formData.address} onChange={handleInputChange} /> </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2"> <Label htmlFor="aadharCardNo">Aadhar Card No</Label> <Input id="aadharCardNo" value={formData.aadharCardNo} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="panCardNo">PAN Card No</Label> <Input id="panCardNo" value={formData.panCardNo} onChange={handleInputChange} /> </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-2"> <Label htmlFor="bankName">Bank Name</Label> <Input id="bankName" value={formData.bankName} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="bankAccountNo">Bank Account No</Label> <Input id="bankAccountNo" value={formData.bankAccountNo} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="ifscCode">IFSC Code</Label> <Input id="ifscCode" value={formData.ifscCode} onChange={handleInputChange} /> </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"> <Label htmlFor="qualification">Qualification</Label> <Input id="qualification" value={formData.qualification} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="passOutYear">Pass-out Year</Label> <Input id="passOutYear" value={formData.passOutYear} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="designation">Designation</Label> <Input id="designation" value={formData.designation} onChange={handleInputChange} /> </div>
                     <div className="space-y-2"> <Label htmlFor="dateOfEntryIntoService">Date of Entry into Service</Label> <Input id="dateOfEntryIntoService" type="date" value={formData.dateOfEntryIntoService} onChange={handleInputChange} /> </div>
                    <div className="space-y-2"> <Label htmlFor="stipend">Stipend</Label> <Input id="stipend" type="number" value={formData.stipend || ''} onChange={(e) => setFormData(prev => ({...prev, stipend: e.target.value ? Number(e.target.value) : undefined}))} /> </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2"> <Label htmlFor="year">Year</Label> <Input id="year" value={formData.year} onChange={handleInputChange} placeholder="e.g., 2024" /> </div>
                    <div className="space-y-2"> <Label htmlFor="semester">Semester</Label> <Input id="semester" value={formData.semester} onChange={handleInputChange} placeholder="e.g., 1st" /> </div>
                    <div className="space-y-2">
                        <Label htmlFor="enrollmentSeason">Enrollment</Label>
                        <Select onValueChange={(value: 'Summer' | 'Winter') => handleSelectChange('enrollmentSeason', value)} value={formData.enrollmentSeason}>
                            <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                            <SelectContent> <SelectItem value="Summer">Summer</SelectItem> <SelectItem value="Winter">Winter</SelectItem> </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Courses of Interest</Label>
                    <ScrollArea className="h-32 w-full rounded-md border p-2">
                        <div className="space-y-2">
                            {courses.map(course => (
                                <div key={course.id} className="flex items-center gap-2">
                                    <Checkbox id={`course-${course.id}`} checked={formData.enrolledCourses?.includes(course.name)} onCheckedChange={() => handleCourseToggle(course.name)} />
                                    <Label htmlFor={`course-${course.id}`} className="font-normal">{course.name}</Label>
                                </div>
                            ))}
                            {courses.length === 0 && <p className="text-sm text-muted-foreground text-center">No courses found.</p>}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</> : (existingParticipantId ? 'Update Application' : 'Submit Application')}
                </Button>
            </CardFooter>
        </Card>
    );
};


export default function SupervisorUsersPage() {
    const router = useRouter();
    const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const userRole = sessionStorage.getItem('userRole');
        const userJson = sessionStorage.getItem('user');

        if (userRole === 'supervisor' && userJson) {
            const currentUser = JSON.parse(userJson) as Supervisor;
            setSupervisor(currentUser);
            
            if (currentUser.organization) {
                setLoading(true);
                const [fetchedCourses, fetchedParticipants] = await Promise.all([
                    getCourses(),
                    getParticipantsByOrganization(currentUser.organization),
                ]);
                
                setCourses(fetchedCourses);
                setParticipants(fetchedParticipants);
                setLoading(false);
            } else {
                 setLoading(false);
            }
        } else {
            router.push('/supervisor-login');
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="pb-8">
             <div className="mb-6 mt-6">
                <Button asChild variant="outline">
                    <Link href="/supervisor/dashboard">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
            <Tabs defaultValue="directory">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="directory">Trainee Directory</TabsTrigger>
                    <TabsTrigger value="add-update">Add/Update Trainee</TabsTrigger>
                </TabsList>
                <TabsContent value="directory" className="mt-4">
                    <DirectoryTab participants={participants} />
                </TabsContent>
                <TabsContent value="add-update" className="mt-4">
                    <AddUpdateTab 
                        courses={courses}
                        onParticipantAdded={fetchData}
                        supervisor={supervisor}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
