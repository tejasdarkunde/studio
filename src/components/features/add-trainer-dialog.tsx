
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
import type { Trainer } from '@/lib/types';
import { Loader2 } from 'lucide-react';

type AddTrainerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: { name: string; meetingLink: string; username: string; password?: string; }) => Promise<void>;
  initialData?: Trainer | null;
};

export function AddTrainerDialog({ isOpen, onClose, onSave, initialData }: AddTrainerDialogProps) {
  const [name, setName] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setMeetingLink(initialData?.meetingLink || '');
      setUsername(initialData?.username || '');
      setPassword(''); // Always clear password for security
      setIsSaving(false);
    }
  }, [isOpen, initialData]);

  const handleSave = async () => {
    if (!name.trim() || !meetingLink.trim() || !username.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Trainer name, meeting link and username are required.",
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

    if (!initialData && !password) {
        toast({
            variant: "destructive",
            title: "Password Required",
            description: "A password is required for new trainers.",
        });
        return;
    }

    if (password && password.length < 6) {
        toast({
            variant: "destructive",
            title: "Password Too Short",
            description: "Password must be at least 6 characters.",
        });
        return;
    }
    
    setIsSaving(true);
    await onSave({ name, meetingLink, username, password });
    setIsSaving(false);
  };

  const dialogTitle = initialData ? 'Edit Trainer' : 'Add New Trainer';
  const dialogDescription = initialData ? "Update the trainer's details and credentials." : "Enter the details for the new trainer.";

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
          <hr className="col-span-4" />
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">Username *</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="col-span-3" placeholder="trainer.john" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" placeholder={initialData ? 'Leave blank to keep unchanged' : 'Min 6 characters'} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : (initialData ? 'Save Changes' : 'Add Trainer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
