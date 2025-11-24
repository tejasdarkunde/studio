
"use client";

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

type CancelBatchDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  batchName: string;
};

export function CancelBatchDialog({ isOpen, onClose, onConfirm, batchName }: CancelBatchDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    if(!reason.trim()) {
        // You can add a toast notification here if you have one set up
        return;
    }
    setIsConfirming(true);
    await onConfirm(reason);
    setIsConfirming(false);
    setReason(''); // Reset reason after confirmation
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to cancel this batch?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the batch <strong>&quot;{batchName}&quot;</strong> as cancelled. You can undo this action later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
            <Label htmlFor="cancellation-reason">Reason for Cancellation *</Label>
            <Input 
                id="cancellation-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Unforeseen circumstances"
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isConfirming}>Back</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isConfirming || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...</> : 'Yes, cancel batch'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
