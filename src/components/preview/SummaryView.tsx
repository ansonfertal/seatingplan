import React from 'react';
import type { SeatingSummaryRow } from '../../algorithms/summaryGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export type SummaryViewProps = {
  rows: SeatingSummaryRow[];
  totalRoomCount: number;
  totalStudents: number;
  examName: string;
  examDate: string;
  session: string;
};

export const SummaryView: React.FC<SummaryViewProps> = ({
  rows,
  totalRoomCount,
  totalStudents,
  examName,
  examDate,
  session,
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Seating summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-1 text-sm text-slate-700 md:flex-row md:items-center md:justify-between">
            <span className="font-semibold text-slate-900">{examName}</span>
            <span>{examDate}</span>
            <span>Session: {session}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm text-slate-700">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border border-slate-200 px-3 py-2 font-semibold">Date & Time</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Class Room No.</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Branch</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Roll No. Range</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">No. of Students</th>
                <th className="border border-slate-200 px-3 py-2 font-semibold">Total Room Count</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-slate-200 px-3 py-4 text-center text-slate-500">
                    No seating summary rows available.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={`${row.classroomId}-${row.branch}-${index}`} className="align-top">
                    <td className="border border-slate-200 px-3 py-2">{examDate}</td>
                    <td className="border border-slate-200 px-3 py-2">{row.classroomName}</td>
                    <td className="border border-slate-200 px-3 py-2">{row.branch}</td>
                    <td className="border border-slate-200 px-3 py-2">{row.rollRange}</td>
                    <td className="border border-slate-200 px-3 py-2 text-right">{row.studentCount}</td>
                    <td className="border border-slate-200 px-3 py-2 text-right">{totalRoomCount}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold text-slate-900">
                <td className="border border-slate-200 px-3 py-2" colSpan={4}>Grand Total</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{totalStudents}</td>
                <td className="border border-slate-200 px-3 py-2 text-right">{totalRoomCount}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
