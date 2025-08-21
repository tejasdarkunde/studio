
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
import { Calendar as CalendarIcon } from "lucide-react"
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
import type { Trainer, Batch } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type EditBatchDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: { name: string; course: 'Diploma' | 'Advance Diploma' | 'Other'; startDate?: Date; startTime: string; endTime: string; trainerId: string; }) => void;
  initialData?: { name: string; course: 'Diploma' | 'Advance Diploma' | 'Other'; startDate?: string; startTime: string; endTime: string; trainerId?: string; };
  trainers: Trainer[];
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
const courseOptions: Batch['course'][] = ['Diploma', 'Advance Diploma', 'Other'];

export function EditBatchDialog({ isOpen, onClose, onSave, initialData, trainers }: EditBatchDialogProps) {
  const [name, setName] = useState('');
  const [course, setCourse] = useState<Batch['course'] | ''>('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setName(initialData?.name || '');
    setCourse(initialData?.course || '');
    setStartDate(initialData?.startDate ? new Date(initialData.startDate) : undefined);
    setStartTime(initialData?.startTime || '');
    setEndTime(initialData?.endTime || '');
    setTrainerId(initialData?.trainerId || '');
  }, [initialData, isOpen]);

  const handleSave = () => {
    if (!name.trim() || !course || !startTime || !endTime || !trainerId) {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "All fields are required.",
        });
        return;
    }
    onSave({ name: name.trim(), course, startDate, startTime, endTime, trainerId });
    onClose();
  };

  const dialogTitle = initialData ? 'Edit Batch' : 'Create New Batch';
  const dialogDescription = initialData ? "Change the details for your batch." : "Fill in the details for the new training batch.";

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
             <Select onValueChange={(value) => setCourse(value as Batch['course'])} value={course}>
                <SelectTrigger id="course-select" className="col-span-3">
                    <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                    {courseOptions.map(courseOpt => (
                        <SelectItem key={courseOpt} value={courseOpt}>
                            {courseOpt}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
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
             <Select onValueChange={setTrainerId} value={trainerId}>
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
