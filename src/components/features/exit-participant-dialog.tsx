
"use client";

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type ExitParticipantDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: { leftDate: Date; leftRemark: string }) => Promise<void>;
  participantName: string;
};

export function ExitParticipantDialog({ isOpen, onClose, onConfirm, participantName }: ExitParticipantDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [leftDate, setLeftDate] = useState<Date | undefined>(new Date());
  const [leftRemark, setLeftRemark] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setLeftDate(new Date());
      setLeftRemark('');
      setIsConfirming(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!leftDate) {
        toast({ variant: 'destructive', title: "Left Date is required."});
        return;
    }
     if (!leftRemark.trim()) {
        toast({ variant: 'destructive', title: "An exit remark is required."});
        return;
    }
    setIsConfirming(true);
    await onConfirm({ leftDate, leftRemark });
    setIsConfirming(false);
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark Trainee as Exited</AlertDialogTitle>
          <AlertDialogDescription>
            This action will mark <strong>&quot;{participantName}&quot;</strong> as having left the organization. Please provide the exit date and a brief remark.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
            <div className='space-y-2'>
                <Label htmlFor="left-date">Left Date *</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        id="left-date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !leftDate && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {leftDate ? format(leftDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={leftDate}
                        onSelect={setLeftDate}
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className='space-y-2'>
                <Label htmlFor="left-remark">Exit Remark *</Label>
                <Textarea 
                    id="left-remark"
                    value={leftRemark}
                    onChange={(e) => setLeftRemark(e.target.value)}
                    placeholder="e.g., Resigned for personal reasons"
                />
            </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isConfirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirming || !leftDate || !leftRemark.trim()}
          >
            {isConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...</> : 'Confirm Exit'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
