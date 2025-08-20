
"use client";

import { useState } from 'react';
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

type EditBatchNameDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newName: string) => void;
  currentName: string;
};

export function EditBatchNameDialog({ isOpen, onClose, onSave, currentName }: EditBatchNameDialogProps) {
  const [newName, setNewName] = useState(currentName);

  const handleSave = () => {
    if (newName.trim()) {
      onSave(newName.trim());
      onClose();
    }
  };
  
  // Update state if prop changes
  useState(() => {
    setNewName(currentName);
  }, [currentName]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Batch Name</DialogTitle>
          <DialogDescription>
            Change the name of your event batch here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="batch-name" className="text-right">
              Name
            </Label>
            <Input
              id="batch-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="col-span-3"
            />
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
