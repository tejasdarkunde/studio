
"use client";

import type { Participant } from "@/lib/types";
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
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type ParticipantsTableProps = {
  participants: Participant[];
};

export function ParticipantsTable({ participants }: ParticipantsTableProps) {
  const { toast } = useToast();
  
  // A simple CSV export for participants
  const handleExport = () => {
    if (participants.length === 0) {
      toast({
        variant: 'destructive',
        title: "No Data",
        description: "There are no participants to export.",
      });
      return;
    }
    const headers = "Name,IITP No,Mobile No,Organization,Date Added\n";
    const csvRows = participants.map(p => {
      const row = [p.name, p.iitpNo, p.mobile, p.organization, new Date(p.createdAt).toLocaleString()];
      return row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    }).join('\n');

    const csvContent = headers + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-t;' });
    const link = document.createElement('a');

    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `all_participants_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

     toast({
      title: "Export Started",
      description: "Participant data is being downloaded.",
    });
  }

  return (
    <div className="w-full">
       <div className="flex flex-row items-center justify-end pb-4">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={participants.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export All as CSV
        </Button>
      </div>
      <div className="border rounded-lg">
        <ScrollArea className="h-[400px]">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>IITP No</TableHead>
                <TableHead>Mobile No</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Date Added</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {participants && participants.length > 0 ? (
                participants.map((p) => (
                    <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.iitpNo}</TableCell>
                    <TableCell>{p.mobile}</TableCell>
                    <TableCell>{p.organization}</TableCell>
                    <TableCell>
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'N/A'}
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    No participants found. Add one to get started.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </ScrollArea>
       </div>
    </div>
  );
}

