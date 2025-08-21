
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
import { useToast } from '@/hooks/use-toast';

type AddTrainerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: { name: string; meetingLink: string }) => void;
  initialData?: { name: string; meetingLink: string } | null;
};

export function AddTrainerDialog({ isOpen, onClose, onSave, initialData }: AddTrainerDialogProps) {
  const [name, setName] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setMeetingLink(initialData?.meetingLink || '');
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    if (!name.trim() || !meetingLink.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Trainer name and meeting link are required.",
      });
      return;
    }
    // Simple URL validation
    try {
        new URL(meetingLink);
    } catch (_) {
        toast({
            variant: "destructive",
            title: "Invalid URL",
            description: "Please enter a valid meeting link.",
        });
        return;
    }
    
    onSave({ name, meetingLink });
  };

  const dialogTitle = initialData ? 'Edit Trainer' : 'Add New Trainer';
  const dialogDescription = initialData ? "Update the trainer's name or meeting link." : "Enter the details for the new trainer.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose()}}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., John Smith" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="meetingLink" className="text-right">Meeting Link *</Label>
            <Input id="meetingLink" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} className="col-span-3" placeholder="https://zoom.us/j/..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave}>{initialData ? 'Save Changes' : 'Add Trainer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
