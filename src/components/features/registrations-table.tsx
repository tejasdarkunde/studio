"use client";

import { Download } from "lucide-react";
import { exportToCsvV2 } from "@/lib/csv";
import type { Registration } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type RegistrationsTableProps = {
  registrations: Registration[];
};

export function RegistrationsTable({ registrations }: RegistrationsTableProps) {
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
    exportToCsvV2(registrations, `eventlink_registrations_${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: "Export Started",
      description: "Your registration data is being downloaded.",
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Recent Registrations</CardTitle>
          <CardDescription>
            View and export registered attendees.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={registrations.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
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
              {registrations.length > 0 ? (
                registrations.map((reg, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{reg.name}</TableCell>
                    <TableCell>{reg.iitpNo}</TableCell>
                    <TableCell>{reg.organization}</TableCell>
                    <TableCell>
                      {reg.submissionTime ? new Date(reg.submissionTime).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No registrations yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
