
"use client";

import { useState, useMemo } from "react";
import type { Participant, Organization } from "@/lib/types";
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
import { Download, RefreshCw, Loader2, Filter, X, Search, Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import Link from "next/link";

type ParticipantsTableProps = {
  participants: Participant[];
  organizations: Organization[];
  onUpdateSelected: (data: { ids: string[], year?: string, semester?: string, enrollmentSeason?: 'Summer' | 'Winter' }) => Promise<{success: boolean, error?: string, updatedCount?: number}>;
  onDataRefreshed: () => void;
  defaultOrganization?: string;
  profilePath?: string;
};

export function ParticipantsTable({ participants, organizations, onUpdateSelected, onDataRefreshed, defaultOrganization, profilePath = '/supervisor/trainees' }: ParticipantsTableProps) {
  const { toast } = useToast();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [enrollmentSeason, setEnrollmentSeason] = useState<'Summer' | 'Winter' | undefined>();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [filterYear, setFilterYear] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [filterEnrollment, setFilterEnrollment] = useState<'Summer' | 'Winter' | 'all'>('all');
  const [filterOrganization, setFilterOrganization] = useState(defaultOrganization || 'all');
  const [searchTerm, setSearchTerm] = useState('');

  const uniqueYears = useMemo(() => {
    const years = new Set(participants.map(p => p.year).filter((y): y is string => !!y));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [participants]);
  
  const uniqueSemesters = useMemo(() => {
    const semesters = new Set(participants.map(p => p.semester).filter((s): s is string => !!s));
    return Array.from(semesters).sort();
  }, [participants]);

  const filteredParticipants = useMemo(() => {
      return participants.filter(p => {
          const yearMatch = filterYear === 'all' || p.year === filterYear;
          const semesterMatch = filterSemester === 'all' || p.semester === filterSemester;
          const enrollmentMatch = filterEnrollment === 'all' || p.enrollmentSeason === filterEnrollment;
          const organizationMatch = filterOrganization === 'all' || p.organization === filterOrganization;
          const searchMatch = searchTerm.trim() === '' || 
                              p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.iitpNo.toLowerCase().includes(searchTerm.toLowerCase());
          return yearMatch && semesterMatch && enrollmentMatch && searchMatch && organizationMatch;
      });
  }, [participants, filterYear, filterSemester, filterEnrollment, searchTerm, filterOrganization]);


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
        setSelectedRows(new Set(filteredParticipants.map(p => p.id)));
    } else {
        setSelectedRows(new Set());
    }
  }

  // A simple CSV export for participants
  const handleExport = () => {
    if (filteredParticipants.length === 0) {
      toast({
        variant: 'destructive',
        title: "No Data",
        description: "There are no participants matching your filter criteria.",
      });
      return;
    }
    const headers = "Name,IITP No,Mobile No,Organization,Year,Semester,Enrollment,Enrolled Courses,Date Added\n";
    const csvRows = filteredParticipants.map(p => {
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
      if (!defaultOrganization) {
        setFilterOrganization('all');
      }
      setSearchTerm('');
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
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filter & Export Participants</CardTitle>
            <CardDescription>Filter the directory and export the results to CSV.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name or IITP No..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
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
                <div className="space-y-2">
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
                <div className="space-y-2">
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
                 <div className="space-y-2">
                    <Label htmlFor="filter-organization">Organization</Label>
                    <Select onValueChange={setFilterOrganization} value={filterOrganization} disabled={!!defaultOrganization}>
                        <SelectTrigger id="filter-organization"><SelectValue placeholder="All Organizations"/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Organizations</SelectItem>
                            {organizations.map(org => <SelectItem key={org.id} value={org.name}>{org.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={clearFilters}><X className="mr-2 h-4 w-4"/>Clear Filters</Button>
                <Button variant="secondary" onClick={handleExport} disabled={participants.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>
          </CardContent>
      </Card>
      
      <div className="flex flex-row items-center justify-between mt-6">
          <div>
            <h3 className="text-lg font-medium">Full Participant Directory</h3>
            <p className="text-sm text-muted-foreground">{filteredParticipants.length} of {participants.length} participants shown.</p>
          </div>
      </div>

      <div className="border rounded-lg">
        <ScrollArea className="h-[60vh]">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]">
                        <Checkbox
                            checked={selectedRows.size === filteredParticipants.length && filteredParticipants.length > 0}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            disabled={filteredParticipants.length === 0}
                        />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>IITP No</TableHead>
                    <TableHead>Enrolled Courses</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredParticipants.length > 0 ? (
                filteredParticipants.map((p) => (
                    <TableRow key={p.id} data-state={selectedRows.has(p.id) && "selected"}>
                        <TableCell>
                            <Checkbox
                                checked={selectedRows.has(p.id)}
                                onCheckedChange={() => handleSelectRow(p.id)}
                            />
                        </TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.iitpNo}</TableCell>
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
                        <TableCell>{p.year}</TableCell>
                        <TableCell>{p.semester}</TableCell>
                        <TableCell className="text-right">
                            <Button asChild variant="ghost" size="icon">
                                <Link href={`${profilePath}/${p.iitpNo}`}>
                                    <Eye className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" size="icon">
                                <Link href={`${profilePath}/${p.iitpNo}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                </Link>
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                    No participants found matching your filters.
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
