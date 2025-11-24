
"use client";

import { useState, useMemo } from "react";
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
import { Download, RefreshCw, Loader2, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

type ParticipantsTableProps = {
  participants: Participant[];
  onUpdateSelected: (data: { ids: string[], year?: string, semester?: string, enrollmentSeason?: 'Summer' | 'Winter' }) => Promise<{success: boolean, error?: string, updatedCount?: number}>;
  onDataRefreshed: () => void;
};

export function ParticipantsTable({ participants, onUpdateSelected, onDataRefreshed }: ParticipantsTableProps) {
  const { toast } = useToast();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [enrollmentSeason, setEnrollmentSeason] = useState<'Summer' | 'Winter' | undefined>();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [filterYear, setFilterYear] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterEnrollment, setFilterEnrollment] = useState<'Summer' | 'Winter' | 'all'>('all');

  const uniqueYears = useMemo(() => {
    const years = new Set(participants.map(p => p.year).filter((y): y is string => !!y));
    return Array.from(years).sort();
  }, [participants]);
  
  const uniqueSemesters = useMemo(() => {
    const semesters = new Set(participants.map(p => p.semester).filter((s): s is string => !!s));
    return Array.from(semesters).sort();
  }, [participants]);


  const handleSelectRow = (id: string) => {
    setSelectedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
        setSelectedRows(new Set(participants.map(p => p.id)));
    } else {
        setSelectedRows(new Set());
    }
  }

  // A simple CSV export for participants
  const handleExport = () => {
    let dataToExport = participants;
    
    if (filterYear !== 'all') {
        dataToExport = dataToExport.filter(p => p.year === filterYear);
    }
    if (filterSemester !== 'all') {
        dataToExport = dataToExport.filter(p => p.semester === filterSemester);
    }
    if (filterEnrollment !== 'all') {
        dataToExport = dataToExport.filter(p => p.enrollmentSeason === filterEnrollment);
    }


    if (dataToExport.length === 0) {
      toast({
        variant: 'destructive',
        title: "No Data",
        description: "There are no participants matching your filter criteria.",
      });
      return;
    }
    const headers = "Name,IITP No,Mobile No,Organization,Year,Semester,Enrollment,Enrolled Courses,Date Added\n";
    const csvRows = dataToExport.map(p => {
      const enrolledCourses = p.enrolledCourses?.join('; ') || '';
      const row = [p.name, p.iitpNo, p.mobile, p.organization, p.year, p.semester, p.enrollmentSeason, enrolledCourses, new Date(p.createdAt).toLocaleString()];
      return row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',');
    }).join('\n');

    const csvContent = headers + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `filtered_participants_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

     toast({
      title: "Export Started",
      description: "Filtered participant data is being downloaded.",
    });
  }
  
  const handleUpdateSelected = async () => {
    if(selectedRows.size === 0) {
        toast({variant: 'destructive', title: "No participants selected."});
        return;
    }
    if(!year && !semester && !enrollmentSeason) {
        toast({variant: 'destructive', title: "No update values provided."});
        return;
    }

    setIsUpdating(true);
    const result = await onUpdateSelected({
        ids: Array.from(selectedRows),
        year: year || undefined,
        semester: semester || undefined,
        enrollmentSeason: enrollmentSeason
    });

    if(result.success) {
        toast({title: "Update Successful", description: `${result.updatedCount} participants updated.`});
        onDataRefreshed();
        setSelectedRows(new Set());
        setYear('');
        setSemester('');
        setEnrollmentSeason(undefined);
    } else {
        toast({variant: 'destructive', title: "Update Failed", description: result.error});
    }

    setIsUpdating(false);
  }

  const clearFilters = () => {
      setFilterYear('all');
      setFilterSemester('all');
      setFilterEnrollment('all');
  }

  return (
    <div className="w-full space-y-4">
      {selectedRows.size > 0 && (
        <Card className="bg-secondary">
          <CardHeader>
            <CardTitle>{selectedRows.size} Participant(s) Selected</CardTitle>
            <CardDescription>Choose the new values and click update. Fields left blank will not be changed.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-grow space-y-2">
              <Label htmlFor="bulk-year">Year</Label>
              <Input id="bulk-year" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. Winter 2025" />
            </div>
            <div className="flex-grow space-y-2">
              <Label htmlFor="bulk-semester">Semester</Label>
              <Input id="bulk-semester" value={semester} onChange={e => setSemester(e.target.value)} placeholder="e.g. 1st Year" />
            </div>
            <div className="flex-grow space-y-2">
              <Label htmlFor="bulk-season">Enrollment Season</Label>
              <Select onValueChange={(v: 'Summer' | 'Winter') => setEnrollmentSeason(v)} value={enrollmentSeason}>
                <SelectTrigger id="bulk-season"><SelectValue placeholder="Select season" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Summer">Summer</SelectItem>
                  <SelectItem value="Winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdateSelected} disabled={isUpdating} className="w-full md:w-auto">
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
              Update Selected
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
          <CardHeader>
            <CardTitle>Export Participants</CardTitle>
            <CardDescription>Filter participants by year, semester, or enrollment season before exporting.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-grow space-y-2">
                <Label htmlFor="filter-year">Year</Label>
                 <Select onValueChange={setFilterYear} value={filterYear}>
                    <SelectTrigger id="filter-year"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {uniqueYears.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
             <div className="flex-grow space-y-2">
                <Label htmlFor="filter-semester">Semester</Label>
                 <Select onValueChange={setFilterSemester} value={filterSemester}>
                    <SelectTrigger id="filter-semester"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {uniqueSemesters.map(semester => (
                            <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
             <div className="flex-grow space-y-2">
                <Label htmlFor="filter-enrollment">Enrollment</Label>
                <Select onValueChange={(v: 'Summer' | 'Winter' | 'all') => setFilterEnrollment(v)} value={filterEnrollment}>
                    <SelectTrigger id="filter-enrollment"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Seasons</SelectItem>
                        <SelectItem value="Summer">Summer</SelectItem>
                        <SelectItem value="Winter">Winter</SelectItem>
                    </SelectContent>
                </Select>
             </div>
             <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}><X className="mr-2 h-4 w-4"/>Clear</Button>
                <Button variant="secondary" onClick={handleExport} disabled={participants.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
             </div>
          </CardContent>
      </Card>
      <div className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Full Participant Directory</h3>
            <p className="text-sm text-muted-foreground">A complete view of every participant.</p>
          </div>
      </div>
      <div className="border rounded-lg">
        <ScrollArea className="h-[60vh]">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox
                        checked={selectedRows.size === participants.length && participants.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>IITP No</TableHead>
                <TableHead>Mobile No</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead>Enrolled Courses</TableHead>
                <TableHead>Date Added</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {participants && participants.length > 0 ? (
                participants.map((p) => (
                    <TableRow key={p.id} data-state={selectedRows.has(p.id) && "selected"}>
                    <TableCell>
                         <Checkbox
                            checked={selectedRows.has(p.id)}
                            onCheckedChange={() => handleSelectRow(p.id)}
                        />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.iitpNo}</TableCell>
                    <TableCell>{p.mobile}</TableCell>
                    <TableCell>{p.organization}</TableCell>
                    <TableCell>{p.year}</TableCell>
                    <TableCell>{p.semester}</TableCell>
                    <TableCell>{p.enrollmentSeason}</TableCell>
                    <TableCell>
                      {p.enrolledCourses && p.enrolledCourses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.enrolledCourses.map(course => (
                              <Badge key={course} variant="secondary">{course}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'N/A'}
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
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
