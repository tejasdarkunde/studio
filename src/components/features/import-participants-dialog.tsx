
"use client";

import { useState, useCallback } from 'react';
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
import type { Participant } from '@/lib/types';
import Papa from 'papaparse';
import { ScrollArea } from '../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription } from '../ui/alert';
import { Upload } from 'lucide-react';

type ImportParticipantsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (participants: Omit<Participant, 'id' | 'createdAt'>[]) => void;
};

type ParsedParticipant = Omit<Participant, 'id' | 'createdAt'>;

export function ImportParticipantsDialog({ isOpen, onClose, onSave }: ImportParticipantsDialogProps) {
  const [participants, setParticipants] = useState<ParsedParticipant[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');
    setParticipants([]);
    setFileName(file.name);

    if (file.type !== 'text/csv') {
      setError('Invalid file type. Please upload a CSV file.');
      return;
    }

    Papa.parse<ParsedParticipant>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          setError(`Error parsing CSV: ${results.errors[0].message}`);
          return;
        }

        const requiredHeaders = ['name', 'iitpNo', 'mobile', 'organization'];
        const fileHeaders = results.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

        if (missingHeaders.length > 0) {
            setError(`Missing required columns in CSV: ${missingHeaders.join(', ')}.`);
            return;
        }
        
        const validParticipants = results.data.filter(p => p.name && p.iitpNo && p.mobile && p.organization);
        setParticipants(validParticipants);

        if(results.data.length !== validParticipants.length) {
            toast({
                variant: 'destructive',
                title: 'Incomplete Rows Skipped',
                description: `${results.data.length - validParticipants.length} rows were skipped due to missing data.`
            })
        }
      },
      error: (err) => {
        setError(`An error occurred during parsing: ${err.message}`);
      }
    });

  }, [toast]);

  const handleSave = () => {
    if (participants.length > 0) {
      onSave(participants);
    } else {
        toast({
            variant: "destructive",
            title: "No Data",
            description: "No valid participants to import.",
        })
    }
  };
  
  const resetState = () => {
    setParticipants([]);
    setFileName('');
    setError('');
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) resetState()}}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Import Participants from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file with participant data. The file must contain columns: name, iitpNo, mobile, organization.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="csv-file" className="text-right">
                CSV File
                </Label>
                <div className="col-span-3">
                    <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} className="pt-1.5"/>
                </div>
            </div>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {participants.length > 0 && (
              <div className='space-y-2'>
                <Label>Preview of Participants ({participants.length} found)</Label>
                <ScrollArea className="h-64 w-full rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>IITP No.</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Organization</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {participants.map((p, index) => (
                                <TableRow key={index}>
                                    <TableCell>{p.name}</TableCell>
                                    <TableCell>{p.iitpNo}</TableCell>
                                    <TableCell>{p.mobile}</TableCell>
                                    <TableCell>{p.organization}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
              </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetState}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={participants.length === 0 || !!error}>
            <Upload className='mr-2 h-4 w-4' />
            Import {participants.length > 0 ? participants.length : ''} Participants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
