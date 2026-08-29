import React from 'react';
import type { Student } from '../../models/student';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export type StudentDetailItem = {
  classroomName: string;
  row: number;
  column: number;
  seatIndex: number;
};

export type StudentDetailPanelProps = {
  student?: Student;
  seat?: StudentDetailItem;
};

export const StudentDetailPanel: React.FC<StudentDetailPanelProps> = ({ student, seat }) => {
  if (!student || !seat) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seat details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Select a seat to view the assigned student information.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{student.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
          <span>Register number</span>
          <strong>{student.registerNumber}</strong>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
          <span>Branch</span>
          <strong>{student.branch}</strong>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
          <span>Classroom</span>
          <strong>{seat.classroomName}</strong>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
          <span>Seat</span>
          <strong>
            Row {seat.row + 1}, Col {seat.column + 1}
          </strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Bench index</span>
          <strong>{seat.seatIndex + 1}</strong>
        </div>
      </CardContent>
    </Card>
  );
};
