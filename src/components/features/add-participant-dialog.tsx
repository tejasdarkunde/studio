
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Participant, Course, Organization } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Loader2 } from 'lucide-react';


type AddParticipantDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: Omit<Participant, 'id' | 'createdAt' | 'completedLessons' | 'deniedCourses'>) => Promise<void>;
  courses: Course[];
  organizations: Organization[];
};


export function AddParticipantDialog({ isOpen, onClose, onSave, courses, organizations }: AddParticipantDialogProps) {
  const [name, setName] = useState('');
  const [iitpNo, setIitpNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [organization, setOrganization] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName('');
      setIitpNo('');
      setMobile('');
      setOrganization('');
      setSelectedCourses([]);
      setIsSaving(false);
    }
  }, [isOpen]);

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
    await onSave({ name, iitpNo, mobile, organization, enrolledCourses: selectedCourses });
    setIsSaving(false);
  };
  
  const handleCourseToggle = (courseName: string) => {
    setSelectedCourses(prev => 
        prev.includes(courseName) 
            ? prev.filter(c => c !== courseName) 
            : [...prev, courseName]
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose()}}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Participant</DialogTitle>
          <DialogDescription>Enter the details for the new participant. This will add them to the central user directory.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
             <Select onValueChange={setOrganization} value={organization}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.name}>
                      {org.name}
                    </SelectItem>
                  ))}
                   <SelectItem value="Other">Other</SelectItem>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Adding...</> : 'Add Participant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
