
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
import type { Participant } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';


type AddParticipantDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: Omit<Participant, 'id' | 'createdAt'>) => void;
};

const organizations = [
  "TE Connectivity, Shirwal",
  "BSA Plant, Chakan",
  "Belden India",
  "Other",
];

export function AddParticipantDialog({ isOpen, onClose, onSave }: AddParticipantDialogProps) {
  const [name, setName] = useState('');
  const [iitpNo, setIitpNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [organization, setOrganization] = useState('');
  const [enrolledCourses, setEnrolledCourses] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName('');
      setIitpNo('');
      setMobile('');
      setOrganization('');
      setEnrolledCourses('');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!name.trim() || !iitpNo.trim()) {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Please fill out Name and IITP No. fields to add a participant.",
        });
      return;
    }
    
    const coursesArray = enrolledCourses.split(',').map(c => c.trim()).filter(c => c);
    
    onSave({ name, iitpNo, mobile, organization, enrolledCourses: coursesArray });
  };

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
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
             <Label htmlFor="enrolledCourses" className="text-right pt-2">Enrolled Courses</Label>
             <Textarea
                id="enrolledCourses"
                value={enrolledCourses}
                onChange={(e) => setEnrolledCourses(e.target.value)}
                className="col-span-3"
                placeholder="Course A, Course B, ..."
             />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Add Participant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
