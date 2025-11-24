

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Batch, Participant, Trainer, Course, Subject, Unit, Lesson, SuperAdmin, Organization, OrganizationAdmin, Exam, Question, Registration, FormAdmin } from '@/lib/types';
import { AddParticipantDialog } from '@/components/features/add-participant-dialog';
import { ImportParticipantsDialog } from '@/components/features/import-participants-dialog';
import { ParticipantsTable } from '@/components/features/participants-table';
import { TrainersTable } from '@/components/features/trainers-table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pencil, PlusCircle, Trash, UserPlus, Upload, Download, Users, BookUser, Presentation, Building, Search, Loader2, UserCog, CalendarCheck, BookCopy, ListPlus, Save, XCircle, ChevronRight, FolderPlus, FileVideo, Video, Clock, Lock, Unlock, Replace, CircleDot, Circle, CircleSlash, ShieldCheck, ShieldOff, Phone, UserCircle, Briefcase, RefreshCw, Ban, RotateCcw, Calendar as CalendarIcon, FileQuestion, HelpCircle, Check, Trash2, GraduationCap, LayoutDashboard, FileText, Settings, Book, Image as ImageIcon, Contact, ChevronLeft } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addParticipant, addParticipantsInBulk, updateParticipant, getTrainers, addTrainer, updateTrainer, deleteTrainer, getCourses, transferStudents, addSuperAdmin, getSuperAdmins, deleteSuperAdmin, updateSuperAdmin, isPrimaryAdmin, getOrganizations, addOrganization, getOrganizationAdmins, addOrganizationAdmin, updateOrganizationAdmin, deleteOrganizationAdmin, backfillOrganizationsFromParticipants, getFormAdmins, addFormAdmin, updateFormAdmin, deleteFormAdmin, getParticipants, updateSelectedParticipants } from '@/app/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { AddTrainerDialog } from '@/components/features/add-trainer-dialog';
import { DeleteBatchDialog } from '@/components/features/delete-batch-dialog';
import { ConfirmDialog } from '@/components/features/confirm-dialog';


const organizations = [
  "TE Connectivity, Shirwal",
  "BSA Plant, Chakan",
  "Belden India",
  "Other",
];


const SuperAdminsTable = ({
    superAdmins,
    onEdit,
    onDelete,
    currentUser
}: {
    superAdmins: (SuperAdmin & {isPrimary: boolean})[];
    onEdit: (admin: SuperAdmin) => void;
    onDelete: (admin: SuperAdmin) => void;
    currentUser: SuperAdmin;
}) => {
    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {superAdmins.map(admin => (
                        <TableRow key={admin.id}>
                            <TableCell className="font-medium">
                                {admin.name}
                                {admin.isPrimary && <Badge variant="secondary" className="ml-2">Primary</Badge>}
                            </TableCell>
                            <TableCell>{admin.username}</TableCell>
                            <TableCell>{admin.mobile}</TableCell>
                            <TableCell>
                                {admin.canManageAdmins ? (
                                    <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3"/> Can Manage</Badge>
                                ) : (
                                    <Badge variant="outline"><ShieldOff className="mr-1 h-3 w-3"/> Cannot Manage</Badge>
                                )}
                            </TableCell>
                            <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                {(currentUser.canManageAdmins || admin.id === currentUser.id) && admin.id !== currentUser.createdBy && (
                                     <Button variant="ghost" size="icon" onClick={() => onEdit(admin)}>
                                        <Pencil className="h-4 w-4"/>
                                    </Button>
                                )}
                                {!admin.isPrimary && currentUser.canManageAdmins && admin.id !== currentUser.id && admin.id !== currentUser.createdBy && (
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(admin)}>
                                        <Trash className="h-4 w-4"/>
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

const ManageAdminDialog = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    currentUser
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {id?: string; name: string; mobile?: string; username: string; password?: string; canManageAdmins?: boolean; currentUserId?: string}) => Promise<void>;
    initialData?: SuperAdmin | null;
    currentUser?: SuperAdmin | null;
}) => {
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [canManageAdmins, setCanManageAdmins] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setName(initialData?.name || '');
            setMobile(initialData?.mobile || '');
            setUsername(initialData?.username || '');
            setCanManageAdmins(initialData?.canManageAdmins || false);
            setPassword('');
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave({
            id: initialData?.id,
            name,
            mobile,
            username,
            password: password || undefined,
            canManageAdmins: canManageAdmins,
            currentUserId: currentUser?.id,
        });
        setIsSaving(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
              <DialogHeader>
                  <DialogTitle>{initialData?.id === currentUser?.id ? 'Edit My Profile' : initialData ? 'Edit Superadmin' : 'Add New Superadmin'}</DialogTitle>
                  <DialogDescription>{initialData ? `Update details for ${initialData.name}.` : 'Create a new user with administrative privileges.'}</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div>
                      <Label htmlFor="admin-name">Full Name</Label>
                      <Input id="admin-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                      <Label htmlFor="admin-mobile">Mobile Number</Label>
                      <Input id="admin-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                  </div>
                  <Separator />
                  <div>
                      <Label htmlFor="admin-username">Username</Label>
                      <Input id="admin-username" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                   <div>
                      <Label htmlFor="admin-password">Password</Label>
                      <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initialData ? 'Leave blank to keep unchanged' : 'Min 6 characters'} />
                  </div>
                  {currentUser?.isPrimary && (
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="can-manage-admins"
                            checked={canManageAdmins}
                            onCheckedChange={setCanManageAdmins}
                            disabled={initialData?.id === currentUser.id}
                        />
                        <Label htmlFor="can-manage-admins">Allow this admin to manage other admins</Label>
                    </div>
                  )}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (initialData ? 'Save Changes' : 'Add Superadmin')}
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
    )
}

const ManageOrganizationAdminDialog = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    organizations,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {id?: string; name: string; username: string; password?: string; organizationName: string;}) => Promise<void>;
    initialData?: OrganizationAdmin | null;
    organizations: Organization[];
}) => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if(isOpen) {
            setName(initialData?.name || '');
            setUsername(initialData?.username || '');
            setOrganizationName(initialData?.organizationName || '');
            setPassword('');
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!name.trim() || !username.trim() || !organizationName) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Name, username, and organization are required."});
            return;
        }
        if (!initialData && !password.trim()) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Password is required for new admins."});
            return;
        }
        setIsSaving(true);
        await onSave({
            id: initialData?.id,
            name,
            username,
            organizationName,
            password: password || undefined,
        });
        setIsSaving(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
              <DialogHeader>
                  <DialogTitle>{initialData ? 'Edit Organization Admin' : 'Add New Organization Admin'}</DialogTitle>
                  <DialogDescription>{initialData ? `Update details for ${initialData.name}.` : 'Create a new representative account for an organization.'}</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div>
                      <Label htmlFor="org-admin-name">Full Name</Label>
                      <Input id="org-admin-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                   <div>
                        <Label htmlFor="org-select">Organization</Label>
                        <Select onValueChange={setOrganizationName} value={organizationName}>
                            <SelectTrigger id="org-select">
                                <SelectValue placeholder="Select an organization" />
                            </SelectTrigger>
                            <SelectContent>
                                {organizations.map((org) => <SelectItem key={org.id} value={org.name}>{org.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                  </div>
                  <Separator />
                  <div>
                      <Label htmlFor="org-admin-username">Username</Label>
                      <Input id="org-admin-username" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                   <div>
                      <Label htmlFor="org-admin-password">Password</Label>
                      <Input id="org-admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initialData ? 'Leave blank to keep unchanged' : 'Min 6 characters'} />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (initialData ? 'Save Changes' : 'Add Admin')}
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
    )
}

const ManageFormAdminDialog = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {id?: string; name: string; username: string; password?: string;}) => Promise<void>;
    initialData?: FormAdmin | null;
}) => {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if(isOpen) {
            setName(initialData?.name || '');
            setUsername(initialData?.username || '');
            setPassword('');
            setIsSaving(false);
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!name.trim() || !username.trim()) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Name and username are required."});
            return;
        }
        if (!initialData && !password.trim()) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Password is required for new admins."});
            return;
        }
        setIsSaving(true);
        await onSave({
            id: initialData?.id,
            name,
            username,
            password: password || undefined,
        });
        setIsSaving(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
              <DialogHeader>
                  <DialogTitle>{initialData ? 'Edit Form Admin' : 'Add New Form Admin'}</DialogTitle>
                  <DialogDescription>{initialData ? `Update details for ${initialData.name}.` : 'Create a new user account for the form portal.'}</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div>
                      <Label htmlFor="form-admin-name">Full Name</Label>
                      <Input id="form-admin-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <Separator />
                  <div>
                      <Label htmlFor="form-admin-username">Username</Label>
                      <Input id="form-admin-username" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                   <div>
                      <Label htmlFor="form-admin-password">Password</Label>
                      <Input id="form-admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initialData ? 'Leave blank to keep unchanged' : 'Min 6 characters'} />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (initialData ? 'Save Changes' : 'Add Admin')}
                  </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
    )
}


export default function AdminUsersPage() {
  const router = useRouter();
  // Data states
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [superAdmins, setSuperAdmins] = useState<(SuperAdmin & {isPrimary: boolean})[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationAdmins, setOrganizationAdmins] = useState<OrganizationAdmin[]>([]);
  const [formAdmins, setFormAdmins] = useState<FormAdmin[]>([]);
  
  // Auth states
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'superadmin' | 'trainer' | null>(null);
  const [currentUser, setCurrentUser] = useState<SuperAdmin | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Dialog states
  const [isAddParticipantOpen, setAddParticipantOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [isAddTrainerOpen, setAddTrainerOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [deletingTrainerId, setDeletingTrainerId] = useState<string | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<SuperAdmin | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<SuperAdmin | null>(null);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [editingOrgAdmin, setEditingOrgAdmin] = useState<OrganizationAdmin | null>(null);
  const [isAddOrgAdminOpen, setIsAddOrgAdminOpen] = useState(false);
  const [deletingOrgAdmin, setDeletingOrgAdmin] = useState<OrganizationAdmin | null>(null);
  const [editingFormAdmin, setEditingFormAdmin] = useState<FormAdmin | null>(null);
  const [isAddFormAdminOpen, setIsAddFormAdminOpen] = useState(false);
  const [deletingFormAdmin, setDeletingFormAdmin] = useState<FormAdmin | null>(null);
  

  // Form & Filter states
  const [searchIitpNo, setSearchIitpNo] = useState('');
  const [isFetchingParticipant, setIsFetchingParticipant] = useState(false);
  const [fetchedParticipant, setFetchedParticipant] = useState<Participant | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Participant>>({ name: '', iitpNo: '', mobile: '', organization: '', enrolledCourses: [], deniedCourses: [], year: '', semester: '', enrollmentSeason: undefined });
  const [sourceCourse, setSourceCourse] = useState('');
  const [destinationCourse, setDestinationCourse] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isUpdatingParticipant, setIsUpdatingParticipant] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isBackfilling, setIsBackfilling] = useState(false);
  

  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    const role = sessionStorage.getItem('userRole');
    const actions: Promise<any>[] = [getParticipants(), getTrainers(), getCourses()];
    if (role === 'superadmin') {
        actions.push(getSuperAdmins(), getOrganizations(), getOrganizationAdmins(), getFormAdmins());
    }
    
    const [fetchedParticipants, fetchedTrainers, fetchedCourses, fetchedAdmins, fetchedOrgs, fetchedOrgAdmins, fetchedFormAdmins] = await Promise.all(actions);

    setParticipants(fetchedParticipants);
    setTrainers(fetchedTrainers);
    setCourses(fetchedCourses);
    if(fetchedOrgs) setOrganizations(fetchedOrgs);
    if(fetchedOrgAdmins) setOrganizationAdmins(fetchedOrgAdmins);
    if(fetchedFormAdmins) setFormAdmins(fetchedFormAdmins);

    if(fetchedAdmins) {
         const adminsWithPrimaryFlag = await Promise.all(fetchedAdmins.map(async (admin: SuperAdmin) => {
            const { isPrimary } = await isPrimaryAdmin(admin.id);
            return { ...admin, isPrimary };
        }));
        setSuperAdmins(adminsWithPrimaryFlag);
        
        // Update current user state if they are a superadmin
        const userJson = sessionStorage.getItem('user');
        if (userJson) {
            const user = JSON.parse(userJson);
            const userWithPrimary = adminsWithPrimaryFlag.find(a => a.id === user.id);
            if(userWithPrimary) {
                setCurrentUser(userWithPrimary);
            }
        }
    }
  }, []);
  
  useEffect(() => {
    setIsClient(true);
    // Check session storage for auth state
    const role = sessionStorage.getItem('userRole') as 'superadmin' | 'trainer' | null;
    const userJson = sessionStorage.getItem('user');


    if(role === 'superadmin') {
        setIsAuthenticated(true);
        setUserRole(role);
        if (userJson) {
            setCurrentUser(JSON.parse(userJson));
        }
        fetchAllData();
    } else {
        router.push('/login');
    }
    setLoadingAuth(false);
  }, [fetchAllData, router]);

  useEffect(() => {
    if (fetchedParticipant) {
      setEditFormData({
        id: fetchedParticipant.id,
        name: fetchedParticipant.name,
        iitpNo: fetchedParticipant.iitpNo,
        mobile: fetchedParticipant.mobile || '',
        organization: fetchedParticipant.organization || '',
        enrolledCourses: fetchedParticipant.enrolledCourses || [],
        deniedCourses: fetchedParticipant.deniedCourses || [],
        year: fetchedParticipant.year || '',
        semester: fetchedParticipant.semester || '',
        enrollmentSeason: fetchedParticipant.enrollmentSeason || undefined,
      });
    } else {
       setEditFormData({ id: '', name: '', iitpNo: '', mobile: '', organization: '', enrolledCourses: [], deniedCourses: []});
    }
  }, [fetchedParticipant]);

  const participantSummary = useMemo(() => {
    if (!fetchedParticipant) return null;
    const enrolledCoursesDetails = courses.filter(c => fetchedParticipant.enrolledCourses?.includes(c.name));

    let totalLessons = 0;
    enrolledCoursesDetails.forEach(course => {
        course.subjects.forEach(subject => {
            subject.units.forEach(unit => {
                totalLessons += unit.lessons.length;
            });
        });
    });

    const completedLessons = fetchedParticipant.completedLessons?.length || 0;
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const submittedExams = Object.values(fetchedParticipant.examProgress || {}).filter(attempt => attempt.isSubmitted).length;

    return {
      enrolledCount: enrolledCoursesDetails.length,
      completedLessons,
      totalLessons,
      progressPercentage: percentage,
      submittedExams,
    };
  }, [fetchedParticipant, courses]);


  const handleAddParticipant = async (details: Omit<Participant, 'id' | 'createdAt' | 'completedLessons' | 'deniedCourses'>) => {
    const result = await addParticipant(details);
    if(result.success) {
        toast({
            title: "Participant Added",
            description: `${details.name} has been added to the central directory.`,
        });
        fetchAllData();
        setAddParticipantOpen(false);
    } else {
        toast({
            variant: "destructive",
            title: "Error Adding Participant",
            description: result.error || "Could not add the participant."
        });
    }
  };

  const handleFetchParticipant = async () => {
    if (!searchIitpNo.trim()) {
      toast({
        variant: 'destructive',
        title: 'IITP No Required',
        description: 'Please enter an IITP No to search.',
      });
      return;
    }
    setIsFetchingParticipant(true);
    setFetchedParticipant(null);
    
    // We can search the client-side list first for speed
    const found = participants.find(p => p.iitpNo === searchIitpNo.trim());

    if (found) {
        setFetchedParticipant(found);
    } else {
        toast({
            variant: 'destructive',
            title: 'Not Found',
            description: `No participant found with IITP No: ${searchIitpNo}`
        });
    }

    setIsFetchingParticipant(false);
  }

  const handleUpdateParticipant = async () => {
    if (!editFormData.id) return;
    
    setIsUpdatingParticipant(true);
    const result = await updateParticipant({
      ...editFormData,
      enrolledCourses: Array.isArray(editFormData.enrolledCourses) ? editFormData.enrolledCourses : String(editFormData.enrolledCourses).split(',').map(c => c.trim()).filter(Boolean),
      id: fetchedParticipant?.id || '',
      completedLessons: fetchedParticipant?.completedLessons || [],
      deniedCourses: editFormData.deniedCourses || [],
    } as Participant);
    
    if (result.success) {
      toast({
        title: 'Participant Updated',
        description: `Details for ${editFormData.name} have been saved.`,
      });
      fetchAllData();
      setFetchedParticipant(null); // Clear the form
      setSearchIitpNo('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: result.error || 'Could not update participant.',
      });
    }
    setIsUpdatingParticipant(false);
  };

  const handleDownloadTemplate = () => {
    const headers = "name,iitpNo,mobile,organization,enrolledCourses,year,semester,enrollmentSeason\n";
    const example = "John Doe,IIPT123,1234567890,Example Org,\"Course A,Course B\",2024,1st,Summer\n";
    const csvContent = headers + example;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'participants_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSave = async (importedParticipants: Omit<Participant, 'id'|'createdAt'|'completedLessons'|'deniedCourses'>[]) => {
    if (importedParticipants.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Participants',
        description: 'No valid participant data was found in the file to import.',
      });
      return;
    }

    const result = await addParticipantsInBulk(importedParticipants);

    if (result.success) {
      const successfulCount = importedParticipants.length - (result.skippedCount || 0);
      toast({
        title: 'Import Complete',
        description: `${successfulCount} participants have been added. ${result.skippedCount || 0} were skipped.`,
      });
      fetchAllData();
      setImportDialogOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: result.error || 'An unexpected error occurred during the bulk import.',
      });
    }

  };
  
  // Trainer Handlers
  const handleSaveTrainer = async (details: { id?: string; name: string; mobile?: string; meetingLink: string; username: string; password?: string; }) => {
    const action = editingTrainer ? updateTrainer : addTrainer;
    const payload = editingTrainer ? { ...details, id: editingTrainer.id } : details;

    const result = await action(payload as any); // Cast needed due to overload

    if (result.success) {
      toast({
        title: `Trainer ${editingTrainer ? 'Updated' : 'Added'}`,
        description: `${details.name} has been saved successfully.`,
      });
      fetchAllData();
      setEditingTrainer(null);
      setAddTrainerOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: `Error ${editingTrainer ? 'Updating' : 'Adding'} Trainer`,
        description: result.error || `Could not save the trainer.`,
      });
    }
  }

  const handleDeleteTrainer = async () => {
    if (!deletingTrainerId) return;

    const result = await deleteTrainer(deletingTrainerId);
    if(result.success) {
      toast({
        title: 'Trainer Deleted',
        description: 'The trainer has been removed.',
      });
      fetchAllData();
    } else {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: result.error || 'Could not delete the trainer.',
      });
    }
    setDeletingTrainerId(null);
  }

  const handleStudentTransfer = async () => {
    if (!sourceCourse || !destinationCourse) {
        toast({ variant: 'destructive', title: 'Selection Required', description: 'Please select both a source and a destination course.' });
        return;
    }
    setIsTransferring(true);
    const result = await transferStudents({ sourceCourseName: sourceCourse, destinationCourseName: destinationCourse });
    if (result.success) {
        toast({
            title: "Transfer Complete",
            description: `${result.transferredCount || 0} student(s) were enrolled in ${destinationCourse}.`
        });
        fetchAllData(); // Refresh data to reflect changes
        setSourceCourse('');
        setDestinationCourse('');
    } else {
        toast({ variant: 'destructive', title: 'Transfer Failed', description: result.error });
    }
    setIsTransferring(false);
  };

  const handleSaveAdmin = async (data: {id?: string; name: string; mobile?: string; username: string; password?: string; canManageAdmins?: boolean; currentUserId?: string}) => {
    const action = data.id ? updateSuperAdmin : addSuperAdmin;
    const result = await action(data as any);
    if (result.success) {
        toast({ title: `Superadmin ${data.id ? 'Updated' : 'Added'}` });
        fetchAllData();
        setEditingAdmin(null);
        setIsAddAdminOpen(false);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  }
  
  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return;
    const result = await deleteSuperAdmin(deletingAdmin.id);
    if (result.success) {
        toast({ title: "Admin Deleted" });
        fetchAllData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setDeletingAdmin(null);
  }

  const handleAddOrganization = async () => {
      if (!newOrgName.trim()) {
          toast({ variant: 'destructive', title: 'Organization name required' });
          return;
      }
      const result = await addOrganization({ name: newOrgName });
      if(result.success) {
          toast({ title: "Organization Added" });
          fetchAllData();
          setNewOrgName('');
          setIsAddOrgOpen(false);
      } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
  }

  const handleSaveOrgAdmin = async (data: {id?: string; name: string; username: string; password?: string; organizationName: string;}) => {
      const action = data.id ? updateOrganizationAdmin : addOrganizationAdmin;
      const result = await action(data as any);
      if(result.success) {
          toast({ title: `Organization Admin ${data.id ? 'Updated' : 'Added'}` });
          fetchAllData();
          setEditingOrgAdmin(null);
          setIsAddOrgAdminOpen(false);
      } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
  }

  const handleDeleteOrgAdmin = async () => {
      if(!deletingOrgAdmin) return;
      const result = await deleteOrganizationAdmin(deletingOrgAdmin.id);
      if(result.success) {
          toast({ title: "Organization Admin Deleted" });
          fetchAllData();
      } else {
           toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
      setDeletingOrgAdmin(null);
  }

  const handleSaveFormAdmin = async (data: {id?: string; name: string; username: string; password?: string;}) => {
      const action = data.id ? updateFormAdmin : addFormAdmin;
      const result = await action(data as any);
      if(result.success) {
          toast({ title: `Form Admin ${data.id ? 'Updated' : 'Added'}` });
          fetchAllData();
          setEditingFormAdmin(null);
          setIsAddFormAdminOpen(false);
      } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
  }

  const handleDeleteFormAdmin = async () => {
      if(!deletingFormAdmin) return;
      const result = await deleteFormAdmin(deletingFormAdmin.id);
      if(result.success) {
          toast({ title: "Form Admin Deleted" });
          fetchAllData();
      } else {
           toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
      setDeletingFormAdmin(null);
  }

  const handleBackfillOrgs = async () => {
      setIsBackfilling(true);
      const result = await backfillOrganizationsFromParticipants();
      if(result.success) {
          toast({
              title: "Sync Complete",
              description: `${result.count} new organization(s) were found and added.`
          });
          fetchAllData();
      } else {
           toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
      setIsBackfilling(false);
  }
  
  const handleCourseAccessChange = (courseId: string, status: 'granted' | 'denied') => {
    const currentDenied = editFormData.deniedCourses || [];
    if (status === 'denied') {
        // Add to denied list if not already there
        if (!currentDenied.includes(courseId)) {
            setEditFormData(prev => ({...prev, deniedCourses: [...currentDenied, courseId]}));
        }
    } else {
        // Remove from denied list
        setEditFormData(prev => ({...prev, deniedCourses: currentDenied.filter(id => id !== courseId)}));
    }
  };

  const getEnrolledCoursesForParticipant = () => {
    if (!fetchedParticipant?.enrolledCourses) return [];
    return courses.filter(c => fetchedParticipant.enrolledCourses?.includes(c.name));
  };
  
  
  if (!isClient || loadingAuth) {
    return (
        <main className="container mx-auto p-4 md:p-8 flex items-center justify-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
    );
  }
  
  return (
    <>
      <AddParticipantDialog 
        isOpen={isAddParticipantOpen}
        onClose={() => setAddParticipantOpen(false)}
        onSave={handleAddParticipant}
        courses={courses}
        organizations={organizations}
      />
      <ImportParticipantsDialog
        isOpen={isImportDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSave={handleImportSave}
      />
      
      {(isAddTrainerOpen || editingTrainer) && (
        <AddTrainerDialog
            isOpen={isAddTrainerOpen || !!editingTrainer}
            onClose={() => { setAddTrainerOpen(false); setEditingTrainer(null); }}
            onSave={handleSaveTrainer}
            initialData={editingTrainer}
        />
      )}
       <DeleteBatchDialog
          isOpen={!!deletingTrainerId}
          onClose={() => setDeletingTrainerId(null)}
          onConfirm={handleDeleteTrainer}
          batchName={`the trainer: ${trainers.find(t => t.id === deletingTrainerId)?.name || 'N/A'}`}
      />
      <ManageAdminDialog 
        isOpen={isAddAdminOpen || !!editingAdmin}
        onClose={() => {setIsAddAdminOpen(false); setEditingAdmin(null);}}
        onSave={handleSaveAdmin}
        initialData={editingAdmin}
        currentUser={currentUser}
      />
      <Dialog open={isAddOrgOpen} onOpenChange={setIsAddOrgOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Add New Organization</DialogTitle>
                  <DialogDescription>Enter the name for the new organization.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div>
                      <Label htmlFor="new-org-name">Organization Name</Label>
                      <Input id="new-org-name" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOrgOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddOrganization}>Add Organization</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <ManageOrganizationAdminDialog 
        isOpen={isAddOrgAdminOpen || !!editingOrgAdmin}
        onClose={() => {setIsAddOrgAdminOpen(false); setEditingOrgAdmin(null);}}
        onSave={handleSaveOrgAdmin}
        initialData={editingOrgAdmin}
        organizations={organizations}
      />
      <ConfirmDialog 
        isOpen={!!deletingOrgAdmin}
        onClose={() => setDeletingOrgAdmin(null)}
        onConfirm={handleDeleteOrgAdmin}
        title="Delete Organization Admin?"
        description={`This will permanently delete the admin account for "${deletingOrgAdmin?.name}". This action cannot be undone.`}
      />
      <ManageFormAdminDialog
        isOpen={isAddFormAdminOpen || !!editingFormAdmin}
        onClose={() => {setIsAddFormAdminOpen(false); setEditingFormAdmin(null);}}
        onSave={handleSaveFormAdmin}
        initialData={editingFormAdmin}
      />
       <ConfirmDialog 
        isOpen={!!deletingFormAdmin}
        onClose={() => setDeletingFormAdmin(null)}
        onConfirm={handleDeleteFormAdmin}
        title="Delete Form Admin?"
        description={`This will permanently delete the form admin account for "${deletingFormAdmin?.name}". This action cannot be undone.`}
      />
        <main className="container mx-auto p-4 md:p-8">
            <div className="mb-8">
                <Button asChild variant="outline">
                    <Link href="/admin">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Link>
                </Button>
            </div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
                    Manage all users, including participants, trainers, and administrators.
                </p>
            </div>

            <Tabs defaultValue="directory" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="directory">Directory</TabsTrigger>
                    <TabsTrigger value="add">Add / Import</TabsTrigger>
                    <TabsTrigger value="update">Update User</TabsTrigger>
                    <TabsTrigger value="transfer">Course Transfer</TabsTrigger>
                    <TabsTrigger value="trainers">Trainers</TabsTrigger>
                    <TabsTrigger value="organizations">Organizations</TabsTrigger>
                    <TabsTrigger value="admins">Admins</TabsTrigger>
                </TabsList>
                <TabsContent value="directory" className="mt-6">
                    <ParticipantsTable participants={participants} onUpdateSelected={updateSelectedParticipants} onDataRefreshed={fetchAllData}/>
                </TabsContent>

                <TabsContent value="add" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                        <CardTitle>Add a New Participant</CardTitle>
                        <CardDescription>Manually add a single participant to the directory.</CardDescription>
                        </CardHeader>
                        <CardContent>
                        <Button onClick={() => setAddParticipantOpen(true)} className="w-full">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add New Participant
                        </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                        <CardTitle>Import from CSV</CardTitle>
                        <CardDescription>Bulk upload participants from a CSV file.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                        <Button onClick={() => setImportDialogOpen(true)} className="w-full">
                            <Upload className="mr-2 h-4 w-4" />
                            Import from CSV
                        </Button>
                        <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                            <Download className="mr-2 h-4 w-4" />
                            Download Template
                        </Button>
                        </CardContent>
                    </Card>
                    </div>
                </TabsContent>

                <TabsContent value="update" className="mt-6">
                    <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle>Update User Details</CardTitle>
                        <CardDescription>Fetch a user by their IITP No. to edit their details and manage course access.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="searchIitpNo" className="sr-only">IITP No</Label>
                            <Input 
                                id="searchIitpNo"
                                placeholder="Enter IITP No to fetch details..."
                                value={searchIitpNo}
                                onChange={(e) => setSearchIitpNo(e.target.value)}
                                className="max-w-xs"
                            />
                            <Button onClick={handleFetchParticipant} disabled={isFetchingParticipant}>
                                {isFetchingParticipant ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                                Fetch Details
                            </Button>
                        </div>
                        {fetchedParticipant && (
                            <div className="space-y-6">
                            {participantSummary && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Student Summary</CardTitle>
                                        <CardDescription>{fetchedParticipant.name} - {fetchedParticipant.iitpNo}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> <span>{fetchedParticipant.organization || 'N/A'}</span></div>
                                            <div className="flex items-center gap-2"><BookUser className="h-4 w-4 text-muted-foreground" /> <span>{participantSummary.enrolledCount} Courses Enrolled</span></div>
                                            <div className="flex items-center gap-2"><FileQuestion className="h-4 w-4 text-muted-foreground" /> <span>{participantSummary.submittedExams} Exams Submitted</span></div>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Overall Lesson Completion</Label>
                                            <Progress value={participantSummary.progressPercentage} className="mt-1" />
                                            <p className="text-xs text-right text-muted-foreground mt-1">{participantSummary.completedLessons} of {participantSummary.totalLessons} lessons completed ({participantSummary.progressPercentage}%)</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            <div className="border rounded-lg p-4 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-name">Name</Label>
                                        <Input id="edit-name" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-iitpNo">IITP No</Label>
                                        <Input id="edit-iitpNo" value={editFormData.iitpNo} onChange={e => setEditFormData({...editFormData, iitpNo: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-mobile">Mobile No</Label>
                                        <Input id="edit-mobile" value={editFormData.mobile} onChange={e => setEditFormData({...editFormData, mobile: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-organization">Organization</Label>
                                        <Select onValueChange={(value) => setEditFormData({...editFormData, organization: value})} value={editFormData.organization}>
                                            <SelectTrigger id="edit-organization">
                                                <SelectValue placeholder="Select an organization" />
                                            </SelectTrigger>
                                            <SelectContent>
                                            {organizations.map((org) => (
                                                <SelectItem key={org.id} value={org.name}>
                                                {org.name}
                                                </SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="edit-year">Year</Label>
                                        <Input id="edit-year" value={editFormData.year} onChange={e => setEditFormData({...editFormData, year: e.target.value})} />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="edit-semester">Semester</Label>
                                        <Input id="edit-semester" value={editFormData.semester} onChange={e => setEditFormData({...editFormData, semester: e.target.value})} />
                                    </div>
                                     <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="edit-enrollmentSeason">Enrollment</Label>
                                        <Select onValueChange={(value: 'Summer' | 'Winter') => setEditFormData({...editFormData, enrollmentSeason: value})} value={editFormData.enrollmentSeason}>
                                            <SelectTrigger id="edit-enrollmentSeason">
                                                <SelectValue placeholder="Select season" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Summer">Summer</SelectItem>
                                                <SelectItem value="Winter">Winter</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <Label htmlFor="edit-courses">Enrolled Courses (comma-separated)</Label>
                                        <Input
                                            id="edit-courses"
                                            value={Array.isArray(editFormData.enrolledCourses) ? editFormData.enrolledCourses.join(', ') : editFormData.enrolledCourses}
                                            onChange={e => setEditFormData({...editFormData, enrolledCourses: e.target.value.split(',').map(c => c.trim()).filter(Boolean)})}
                                            placeholder="Course A, Course B, ..."
                                        />
                                    </div>
                                </div>
                                <Separator/>
                                <div className="space-y-4">
                                    <Label className="text-base font-medium">Course Access</Label>
                                    <div className="space-y-2">
                                        {getEnrolledCoursesForParticipant().length > 0 ? getEnrolledCoursesForParticipant().map(course => (
                                            <div key={course.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                                                <p className="font-medium">{course.name}</p>
                                                <Select
                                                value={editFormData.deniedCourses?.includes(course.id) ? 'denied' : 'granted'}
                                                onValueChange={(status: 'granted' | 'denied') => handleCourseAccessChange(course.id, status)}
                                                >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Set access" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="granted"><div className="flex items-center gap-2"><Unlock className="h-4 w-4 text-green-600"/> Granted</div></SelectItem>
                                                    <SelectItem value="denied"><div className="flex items-center gap-2"><Lock className="h-4 w-4 text-red-600"/> Denied</div></SelectItem>
                                                </SelectContent>
                                                </Select>
                                            </div>
                                        )) : <p className="text-sm text-muted-foreground">This user is not enrolled in any courses.</p>}
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2 flex justify-end gap-2 pt-4">
                                    <Button variant="outline" onClick={() => {setFetchedParticipant(null); setSearchIitpNo('');}}>Cancel</Button>
                                    <Button onClick={handleUpdateParticipant} disabled={isUpdatingParticipant}>
                                        {isUpdatingParticipant ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Update Details'}
                                    </Button>
                                </div>
                            </div>
                            </div>
                        )}
                    </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="transfer">
                    <Card className="border-dashed">
                        <CardHeader>
                            <CardTitle>Bulk Course Transfer</CardTitle>
                            <CardDescription>Enroll all students from a source course into a destination course. Useful for fixing inconsistent course names.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label htmlFor="source-course">From Course Name</Label>
                                    <Input
                                        id="source-course"
                                        placeholder="Enter the exact source course name"
                                        value={sourceCourse}
                                        onChange={(e) => setSourceCourse(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dest-course">To Course</Label>
                                    <Select onValueChange={setDestinationCourse} value={destinationCourse}>
                                        <SelectTrigger id="dest-course">
                                            <SelectValue placeholder="Select destination course" />
                                        </SelectTrigger>
                                        <SelectContent>
                                        {courses.map(course => <SelectItem key={course.id} value={course.name}>{course.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleStudentTransfer} disabled={isTransferring || !sourceCourse || !destinationCourse}>
                                    {isTransferring ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Replace className="mr-2 h-4 w-4"/>}
                                    {isTransferring ? 'Transferring...' : 'Transfer Students'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="trainers" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                            <CardTitle>Trainer Management</CardTitle>
                            <CardDescription>Add, edit, or remove trainers from the system.</CardDescription>
                            </div>
                            <Button onClick={() => setAddTrainerOpen(true)}>
                                <UserCog className="mr-2 h-4 w-4" />
                                Add New Trainer
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <TrainersTable 
                                trainers={trainers}
                                onEdit={(trainer) => setEditingTrainer(trainer)}
                                onDelete={(trainer) => setDeletingTrainerId(trainer.id)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="organizations" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-start justify-between gap-2">
                                <div>
                                    <CardTitle>Organizations</CardTitle>
                                    <CardDescription>Manage the list of participating organizations.</CardDescription>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Button size="sm" onClick={() => setIsAddOrgOpen(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Organization
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={handleBackfillOrgs} disabled={isBackfilling}>
                                        {isBackfilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                        Sync from Participants
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Date Added</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {organizations.map(org => (
                                                <TableRow key={org.id}>
                                                    <TableCell className="font-medium">{org.name}</TableCell>
                                                    <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                <CardTitle>Organization Admins</CardTitle>
                                <CardDescription>Manage representative accounts for each organization.</CardDescription>
                                </div>
                                <Button size="sm" onClick={() => setIsAddOrgAdminOpen(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Add Admin
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Organization</TableHead>
                                                <TableHead>Username</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {organizationAdmins.map(admin => (
                                                <TableRow key={admin.id}>
                                                    <TableCell className="font-medium">{admin.name}</TableCell>
                                                    <TableCell><Badge variant="secondary">{admin.organizationName}</Badge></TableCell>
                                                    <TableCell>{admin.username}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => setEditingOrgAdmin(admin)}><Pencil className="h-4 w-4"/></Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingOrgAdmin(admin)}><Trash className="h-4 w-4"/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="admins" className="mt-6">
                     <Tabs defaultValue="superadmins">
                        <TabsList>
                            <TabsTrigger value="superadmins">Super Admins</TabsTrigger>
                            <TabsTrigger value="formadmins">Form Admins</TabsTrigger>
                        </TabsList>
                        <TabsContent value="superadmins" className="mt-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Superadmin Management</CardTitle>
                                        <CardDescription>Manage users with full administrative privileges.</CardDescription>
                                    </div>
                                    {(currentUser?.isPrimary || currentUser?.canManageAdmins) && (
                                        <Button onClick={() => setIsAddAdminOpen(true)}>
                                            <ShieldCheck className="mr-2 h-4 w-4" /> Add Superadmin
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {currentUser && (
                                        <SuperAdminsTable 
                                            superAdmins={superAdmins}
                                            onEdit={(admin) => setEditingAdmin(admin)}
                                            onDelete={(admin) => setDeletingAdmin(admin)}
                                            currentUser={currentUser}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="formadmins" className="mt-6">
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Form Admin Management</CardTitle>
                                        <CardDescription>Manage users for the form creation portal.</CardDescription>
                                    </div>
                                    <Button onClick={() => setIsAddFormAdminOpen(true)}>
                                        <Contact className="mr-2 h-4 w-4" /> Add Form Admin
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-lg">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Username</TableHead>
                                                    <TableHead>Date Added</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {formAdmins.map(admin => (
                                                    <TableRow key={admin.id}>
                                                        <TableCell className="font-medium">{admin.name}</TableCell>
                                                        <TableCell>{admin.username}</TableCell>
                                                        <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => setEditingFormAdmin(admin)}><Pencil className="h-4 w-4"/></Button>
                                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingFormAdmin(admin)}><Trash className="h-4 w-4"/></Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                     </Tabs>
                </TabsContent>
            </Tabs>
        </main>
    </>
  );
}
