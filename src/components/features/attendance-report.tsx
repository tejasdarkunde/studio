
"use client";

import { useState, useMemo } from 'react';
import type { Participant, Batch } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AttendanceReportProps = {
  participants: Participant[];
  batches: Batch[];
};

type AttendanceGrid = {
    headers: { id: string, name: string }[];
    rows: {
        participant: Participant;
        attendance: { [batchId: string]: 'P' | 'A' };
    }[];
};

const generateAttendanceGrid = (courseName: string, participants: Participant[], batches: Batch[]): AttendanceGrid => {
    // 1. Filter batches that belong to the course
    const courseBatches = batches
        .filter(b => b.course === courseName)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    const headers = courseBatches.map(b => {
        const date = b.startDate ? new Date(b.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'No Date';
        const time = b.startTime || '';
        const headerName = `${b.name} (${date} ${time})`.trim();
        return { id: b.id, name: headerName };
    });

    // 2. Filter participants enrolled in the course
    const enrolledParticipants = participants.filter(p => 
        p.enrolledCourses?.some(c => c.toLowerCase().includes(courseName.toLowerCase()))
    );

    // 3. Create a map for quick registration lookup: { batchId: Set<iitpNo> }
    const registrationsMap = new Map<string, Set<string>>();
    courseBatches.forEach(batch => {
        const iitpNos = new Set(batch.registrations.map(r => r.iitpNo));
        registrationsMap.set(batch.id, iitpNos);
    });

    // 4. Build the grid rows
    const rows = enrolledParticipants.map(participant => {
        const attendance: { [batchId: string]: 'P' | 'A' } = {};
        courseBatches.forEach(batch => {
            const registeredIitpNos = registrationsMap.get(batch.id);
            attendance[batch.id] = registeredIitpNos?.has(participant.iitpNo) ? 'P' : 'A';
        });
        return { participant, attendance };
    });

    return { headers, rows };
};


const exportGridToCsv = (grid: AttendanceGrid, courseName: string) => {
    if (!grid.headers.length || !grid.rows.length) {
        return;
    }

    const headers = ['Participant Name', 'IITP No', ...grid.headers.map(h => h.name)];
    
    const csvRows = grid.rows.map(row => {
        const participantData = [row.participant.name, row.participant.iitpNo];
        const attendanceData = grid.headers.map(header => row.attendance[header.id]);
        
        const fullRow = [...participantData, ...attendanceData];
        return fullRow.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${courseName}_attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const AttendanceTable = ({ grid, courseName }: { grid: AttendanceGrid, courseName: string }) => {
    const { toast } = useToast();

    const handleExport = () => {
        if (!grid.headers.length || !grid.rows.length) {
            toast({
                variant: 'destructive',
                title: "No Data",
                description: `There is no attendance data to export for ${courseName}.`,
            });
            return;
        }
        exportGridToCsv(grid, courseName);
        toast({
            title: "Export Started",
            description: `The ${courseName} attendance report is being downloaded.`,
        });
    }
    
    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleExport} disabled={!grid.headers.length || !grid.rows.length}>
                    <Download className="mr-2 h-4 w-4" />
                    Export {courseName} Report
                </Button>
            </div>
            {grid.headers.length > 0 && grid.rows.length > 0 ? (
                <ScrollArea className="w-full whitespace-nowrap rounded-md border" style={{ height: '60vh' }}>
                    <Table className="min-w-full">
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="sticky left-0 bg-background z-20 min-w-[200px]">Participant Name</TableHead>
                                <TableHead className="sticky left-[200px] bg-background z-20 min-w-[150px]">IITP No</TableHead>
                                {grid.headers.map(header => (
                                    <TableHead key={header.id} className="min-w-[200px]">{header.name}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {grid.rows.map(row => (
                                <TableRow key={row.participant.id}>
                                    <TableCell className="sticky left-0 bg-background z-10 font-medium">{row.participant.name}</TableCell>
                                    <TableCell className="sticky left-[200px] bg-background z-10">{row.participant.iitpNo}</TableCell>
                                    {grid.headers.map(header => (
                                        <TableCell key={header.id} className={`text-center font-bold ${row.attendance[header.id] === 'P' ? 'text-green-600' : 'text-red-600'}`}>
                                            {row.attendance[header.id]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 border rounded-md">
                    <p className="text-muted-foreground">No attendance data to display for {courseName}.</p>
                    <p className="text-muted-foreground text-sm mt-2">Ensure participants are enrolled and batches are assigned to this course.</p>
                </div>
            )}
        </div>
    );
};


export function AttendanceReport({ participants, batches }: AttendanceReportProps) {
  const uniqueCoursesInBatches = useMemo(() => {
    const courseNames = new Set(batches.map(b => b.course));
    return Array.from(courseNames).sort();
  }, [batches]);

  if (uniqueCoursesInBatches.length === 0) {
      return (
           <div className="flex flex-col items-center justify-center h-64 border rounded-md">
                <p className="text-muted-foreground">No active training sessions to report on.</p>
                <p className="text-muted-foreground text-sm mt-2">Assign a batch to a course to generate a report.</p>
            </div>
      )
  }

  return (
    <Tabs defaultValue={uniqueCoursesInBatches[0]} className="w-full">
      <TabsList>
        {uniqueCoursesInBatches.map(courseName => (
            <TabsTrigger key={courseName} value={courseName}>{courseName}</TabsTrigger>
        ))}
      </TabsList>
      {uniqueCoursesInBatches.map(courseName => {
        const grid = generateAttendanceGrid(courseName, participants, batches);
        return (
            <TabsContent key={courseName} value={courseName} className="mt-6">
                <AttendanceTable grid={grid} courseName={courseName} />
            </TabsContent>
        )
      })}
    </Tabs>
  );
}
