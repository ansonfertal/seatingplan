import React from 'react';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat } from '../../models/arrangement';
import type { Exam, ExamDetails } from '../../models/exam';
import { PrintContainer } from './PrintContainer';

export type DailyAttendanceSheetProps = {
  exam: Exam | ExamDetails;
  rooms: Room[];
  assignments: AssignedSeat[];
  students: ExamCandidate[];
};

export const DailyAttendanceSheet: React.FC<DailyAttendanceSheetProps> = ({
  exam,
  rooms,
  assignments,
  students,
}) => {
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  // Group by Room + Subject Code + Branch
  type RowSummary = {
    roomName: string;
    subjectCode: string;
    branch: string;
    semester: string;
    registeredCount: number;
  };

  const summaryMap = new Map<string, RowSummary>();

  assignments.forEach((a) => {
    const rId = a.roomId || a.classroomId;
    const room = roomMap.get(rId);
    const sId = a.studentId || a.candidateId;
    const candidate = sId ? studentMap.get(sId) : undefined;
    if (!room || !candidate) return;

    const subjectCode = candidate.subjectCode || '';
    const semester = candidate.semester || '';
    const branch = candidate.branch || '';
    const key = `${room.id}|${subjectCode}|${branch}|${semester}`;
    const existing: RowSummary = summaryMap.get(key) || {
      roomName: room.name,
      subjectCode,
      branch,
      semester,
      registeredCount: 0,
    };
    existing.registeredCount += 1;
    summaryMap.set(key, existing);
  });

  const summaryRows = Array.from(summaryMap.values()).sort((a, b) =>
    a.roomName.localeCompare(b.roomName) || a.subjectCode.localeCompare(b.subjectCode)
  );

  const totalRegisteredAll = summaryRows.reduce((acc, r) => acc + r.registeredCount, 0);

  return (
    <div className="space-y-8">
      <PrintContainer
        orientation="landscape"
        documentTitle="DAILY ATTENDANCE SHEET — EXAMINATION SUMMARY"
        documentSubtitle={`CONSOLIDATED SESSION ATTENDANCE RECORD — ${exam.session || 'FN'} SESSION`}
        exam={exam}
        footerContent={
          <div className="border border-slate-700 bg-slate-50 p-4 text-xs font-medium space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <span className="text-slate-600">Total Registered All Halls: </span>
                <strong className="text-slate-900 font-bold">{totalRegisteredAll}</strong>
              </div>
              <div>
                <span className="text-slate-600">Total Present: </span>
                <span className="inline-block border-b border-slate-700 w-20"></span>
              </div>
              <div>
                <span className="text-slate-600">Total Absent: </span>
                <span className="inline-block border-b border-slate-700 w-20"></span>
              </div>
              <div>
                <span className="text-slate-600">Malpractice Reported: </span>
                <span className="inline-block border-b border-slate-700 w-16"></span>
              </div>
            </div>

            <div className="flex justify-between items-end pt-4 border-t border-slate-300">
              <div className="space-y-1">
                <p className="text-[11px] text-slate-500">Verified by Exam Cell Assistant:</p>
                <div className="h-6 border-b border-dashed border-slate-400 w-52"></div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-slate-500">Exam Cell In-Charge Signature:</p>
                <div className="h-6 border-b border-dashed border-slate-400 w-52"></div>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[11px] text-slate-500">Chief Superintendent Official Signature & Seal:</p>
                <div className="h-6 border-b border-dashed border-slate-400 w-64 ml-auto"></div>
              </div>
            </div>
          </div>
        }
      >
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="w-10 text-center">Sl.</th>
              <th className="w-28">Room No.</th>
              <th className="w-28 font-mono">Subject Code</th>
              <th className="w-24">Branch</th>
              <th className="w-16 text-center">Sem</th>
              <th className="w-24 text-center">Registered</th>
              <th className="w-24 text-center">Present</th>
              <th className="w-24 text-center">Absent</th>
              <th>Absentee Register Number(s)</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row, idx) => (
              <tr key={idx} className="handwriting-row">
                <td className="text-center text-slate-600">{idx + 1}</td>
                <td className="font-bold text-slate-900">{row.roomName}</td>
                <td className="font-mono font-semibold text-slate-800">{row.subjectCode}</td>
                <td className="font-semibold text-slate-700">{row.branch}</td>
                <td className="text-center text-slate-700">{row.semester}</td>
                <td className="text-center font-bold text-slate-900">{row.registeredCount}</td>
                <td className="bg-slate-50/20"></td>
                <td className="bg-slate-50/20"></td>
                <td className="bg-slate-50/20"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintContainer>
    </div>
  );
};
