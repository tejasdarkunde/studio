
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
import { Calendar as CalendarIcon, Loader2, Check } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import type { Trainer, Batch, Course, Organization } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { Checkbox } from '../ui/checkbox';


type EditBatchDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: { name: string; course: any; startDate?: Date; startTime: string; endTime: string; trainerId: string; organizations?: string[] }) => Promise<void>;
  initialData?: { name: string; course: 'Diploma' | 'Advance Diploma' | 'Other'; startDate?: string; startTime: string; endTime: string; trainerId?: string; organizations?: string[] };
  trainers: Trainer[];
  courses: Course[];
  organizations: Organization[];
  userRole: 'superadmin' | 'trainer' | null;
  currentTrainerId?: string | null;
};

const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 60; j += 30) {
            const hour = i.toString().padStart(2, '0');
            const minute = j.toString().padStart(2, '0');
            const time = `${hour}:${minute}`;
            
            const displayHour = i % 12 === 0 ? 12 : i % 12;
            const ampm = i < 12 ? 'AM' : 'PM';
            const displayTime = `${displayHour}:${minute} ${ampm}`;

            options.push({ value: time, label: displayTime });
        }
    }
    return options;
}
const timeOptions = generateTimeOptions();


export function EditBatchDialog({ isOpen, onClose, onSave, initialData, trainers, courses, organizations, userRole, currentTrainerId }: EditBatchDialogProps) {
  const [name, setName] = useState('');
  const [course, setCourse] = useState<string | ''>('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        setName(initialData?.name || '');
        setCourse(initialData?.course || '');
        setStartDate(initialData?.startDate ? new Date(initialData.startDate) : undefined);
        setStartTime(initialData?.startTime || '');
        setEndTime(initialData?.endTime || '');
        setSelectedOrgs(initialData?.organizations || []);
        setIsSaving(false);
        
        if (userRole === 'trainer' && !initialData) {
            // For a trainer creating a new batch, lock it to their ID
            setTrainerId(currentTrainerId || '');
        } else {
            setTrainerId(initialData?.trainerId || '');
        }
    }
  }, [initialData, isOpen, userRole, currentTrainerId]);

  const handleSave = async () => {
    if (!name.trim() || !course || !startTime || !endTime || !trainerId) {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "All fields are required.",
        });
        return;
    }
    setIsSaving(true);
    await onSave({ name: name.trim(), course, startDate, startTime, endTime, trainerId, organizations: selectedOrgs });
    setIsSaving(false);
  };
  
  const handleOrgToggle = (orgName: string) => {
    setSelectedOrgs(prev => 
        prev.includes(orgName)
            ? prev.filter(o => o !== orgName)
            : [...prev, orgName]
    )
  }


  const dialogTitle = initialData ? 'Edit Batch' : 'Create New Batch';
  const dialogDescription = initialData ? "Change the details for your batch." : "Fill in the details for the new training batch.";
  const isTrainerCreating = userRole === 'trainer' && !initialData;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose()}}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="batch-name" className="text-right">
              Name
            </Label>
            <Input
              id="batch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Diploma Program Q3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="course-select" className="text-right">
              Course
            </Label>
             <Select onValueChange={(value) => setCourse(value)} value={course}>
                <SelectTrigger id="course-select" className="col-span-3">
                    <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                    {courses.map(courseOpt => (
                        <SelectItem key={courseOpt.id} value={courseOpt.name}>
                            {courseOpt.name}
                        </SelectItem>
                    ))}
                     <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">
              Organizations
            </Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-[280px] justify-between col-span-3">
                        {selectedOrgs.length > 0 ? `${selectedOrgs.length} selected` : "Select organizations..."}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0">
                    <Command>
                        <CommandInput placeholder="Search organizations..." />
                        <CommandEmpty>No organizations found.</CommandEmpty>
                        <CommandGroup>
                            {organizations.map((org) => (
                                <CommandItem
                                    key={org.id}
                                    onSelect={(currentValue) => {
                                        handleOrgToggle(org.name);
                                    }}
                                >
                                    <div
                                        className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary"
                                    >
                                        <Check
                                        className={cn(
                                            "h-4 w-4",
                                            selectedOrgs.includes(org.name) ? "opacity-100" : "opacity-0"
                                        )}
                                        />
                                    </div>
                                    {org.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Date
            </Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "w-[280px] justify-start text-left font-normal col-span-3",
                        !startDate && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    />
                </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="start-time" className="text-right">
              Start Time
            </Label>
             <Select onValueChange={setStartTime} value={startTime}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a start time" />
                </SelectTrigger>
                <SelectContent>
                    {timeOptions.map(option => (
                        <SelectItem key={`start-${option.value}`} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-time" className="text-right">
              End Time
            </Label>
             <Select onValueChange={setEndTime} value={endTime}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an end time" />
                </SelectTrigger>
                <SelectContent>
                    {timeOptions.map(option => (
                        <SelectItem key={`end-${option.value}`} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="trainer-select" className="text-right">
              Trainer
            </Label>
             <Select onValueChange={setTrainerId} value={trainerId} disabled={isTrainerCreating}>
                <SelectTrigger id="trainer-select" className="col-span-3">
                    <SelectValue placeholder="Select a trainer" />
                </SelectTrigger>
                <SelectContent>
                    {trainers.length > 0 ? trainers.map(trainer => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                            {trainer.name}
                        </SelectItem>
                    )) : (
                        <div className="p-4 text-sm text-muted-foreground">No trainers found. Add one on the Trainers tab.</div>
                    )}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
