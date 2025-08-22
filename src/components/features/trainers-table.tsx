
"use client";

import type { Trainer } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Pencil, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type TrainersTableProps = {
  trainers: Trainer[];
  onEdit: (trainer: Trainer) => void;
  onDelete: (trainer: Trainer) => void;
};

export function TrainersTable({ trainers, onEdit, onDelete }: TrainersTableProps) {
  return (
    <div className="w-full">
      <div className="border rounded-lg">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Meeting Link</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainers && trainers.length > 0 ? (
                trainers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.username}</TableCell>
                    <TableCell>
                      <a href={t.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {t.meetingLink}
                      </a>
                    </TableCell>
                    <TableCell>
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => onEdit(t)}>
                            <Pencil className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(t)}>
                            <Trash className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No trainers found. Add one to get started.
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
