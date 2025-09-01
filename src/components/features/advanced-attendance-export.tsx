
"use client";

import { useState } from 'react';
import type { Batch, Course, Registration, Trainer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isWithinInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import JSZip from 'jszip';

type AdvancedAttendanceExportProps = {
  batches: Batch[];
  trainers: Trainer[];
  courses: Course[];
};

export function AdvancedAttendanceExport({ batches, trainers, courses }: AdvancedAttendanceExportProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date, to?: Date }>({});
  const [selectedTrainer, setSelectedTrainer] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);

    let filteredBatches = [...batches];

    // 1. Filter by date range
    if (dateRange.from && dateRange.to) {
        filteredBatches = filteredBatches.filter(batch => {
            if (!batch.startDate) return false;
            const batchDate = new Date(batch.startDate);
            return isWithinInterval(batchDate, { start: dateRange.from!, end: dateRange.to! });
        });
    }

    // 2. Filter by trainer
    if (selectedTrainer && selectedTrainer !== 'all') {
        filteredBatches = filteredBatches.filter(batch => batch.trainerId === selectedTrainer);
    }
    
    // 3. Filter by course
    if (selectedCourse && selectedCourse !== 'all') {
        filteredBatches = filteredBatches.filter(batch => batch.course === selectedCourse);
    }

    if (filteredBatches.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Data Found',
            description: 'No batches match your selected criteria. Please try a different selection.',
        });
        setIsExporting(false);
        return;
    }
    
    const zip = new JSZip();
    let reportsGenerated = 0;

    filteredBatches.forEach(batch => {
        if (batch.registrations && batch.registrations.length > 0) {
            const headers = "Name,IITP No,Mobile No,Organization,Registration Time\n";
            const csvRows = batch.registrations.map(p => {
                const row = [p.name, p.iitpNo, p.mobile, p.organization, new Date(p.submissionTime).toLocaleString()];
                return row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',');
            }).join('\n');
            const csvContent = headers + csvRows;

            const date = batch.startDate ? format(new Date(batch.startDate), 'yyyy-MM-dd') : 'nodate';
            const time = batch.startTime ? batch.startTime.replace(':', '-') : 'notime';
            const sessionName = batch.name.replace(/[^a-z0-9]/gi, '_');

            const fileName = `${date}_${time}_${sessionName}.csv`;
            zip.file(fileName, csvContent);
            reportsGenerated++;
        }
    });

    if (reportsGenerated === 0) {
        toast({
            variant: 'destructive',
            title: 'No Participants Found',
            description: 'There are no registered participants for the batches matching your criteria.',
        });
        setIsExporting(false);
        return;
    }

    try {
        const zipContent = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        
        const url = URL.createObjectURL(zipContent);
        const zipFileName = `attendance_reports_${format(new Date(), 'yyyy-MM-dd')}.zip`;
        link.setAttribute('href', url);
        link.setAttribute('download', zipFileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Export Complete',
          description: `${reportsGenerated} reports have been generated and zipped for download.`,
        });

    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Zip Creation Failed',
            description: 'Could not create the zip file.',
        });
    }

    setIsExporting(false);
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Advanced Export</CardTitle>
        <CardDescription>
          Generate a zip file containing individual CSV reports for each session, based on specific filters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from ? format(dateRange.from, "PPP") : <span>From</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({...prev, from: d}))} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange.to && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.to ? format(dateRange.to, "PPP") : <span>To</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({...prev, to: d}))} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="trainer-filter">Trainer</Label>
                <Select onValueChange={setSelectedTrainer} value={selectedTrainer}>
                    <SelectTrigger id="trainer-filter">
                        <SelectValue placeholder="All Trainers" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Trainers</SelectItem>
                        {trainers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="course-filter">Course</Label>
                <Select onValueChange={setSelectedCourse} value={selectedCourse}>
                    <SelectTrigger id="course-filter">
                        <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {courses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Reports
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
