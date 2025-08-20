"use client";

import { Download } from "lucide-react";
import { exportToCsvV2 } from "@/lib/csv";
import type { Registration } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from "firebase/firestore";

type RegistrationsTableProps = {
  registrations: Registration[];
  batchName?: string;
};

export function RegistrationsTable({ registrations, batchName }: RegistrationsTableProps) {
  const { toast } = useToast();
  
  const handleExport = () => {
    if (registrations.length === 0) {
      toast({
        variant: 'destructive',
        title: "No Data",
        description: "There is no registration data to export.",
      });
      return;
    }
    const safeBatchName = batchName ? batchName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'all';
    exportToCsvV2(registrations, `eventlink_${safeBatchName}_${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: "Export Started",
      description: "Your registration data is being downloaded.",
    });
  };

   const toDate = (timestamp: Date | Timestamp): Date => {
    if (timestamp instanceof Date) {
        return timestamp;
    }
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    return new Date(timestamp);
  }

  return (
    <div className="w-full border rounded-lg p-4">
       <div className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{batchName || "Registrations"}</h3>
           <p className="text-sm text-muted-foreground">
            {registrations.length} attendee(s) registered in this batch.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={registrations.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>IITP No</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Submission Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations && registrations.length > 0 ? (
              registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.name}</TableCell>
                  <TableCell>{reg.iitpNo}</TableCell>
                  <TableCell>{reg.organization}</TableCell>
                  <TableCell>
                    {reg.submissionTime ? toDate(reg.submissionTime).toLocaleString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No registrations yet for this batch.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
