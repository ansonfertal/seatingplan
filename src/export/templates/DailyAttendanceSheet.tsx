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

/**
 * Daily Consolidated Attendance Summary Sheet (Strictly Monochrome Black & White)
 */
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
    <div className="space-y-8 bg-white">
      <PrintContainer
        orientation="landscape"
        documentTitle="DAILY ATTENDANCE SHEET — EXAMINATION SUMMARY"
        documentSubtitle={`CONSOLIDATED SESSION ATTENDANCE RECORD — ${exam.session || 'FN'} SESSION`}
        exam={exam}
        className="bg-white text-black"
        footerContent={
          <div className="border border-black bg-white p-3 text-xs font-medium text-black space-y-3">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <span className="text-black">Total Registered All Halls: </span>
                <strong className="text-black font-bold">{totalRegisteredAll}</strong>
              </div>
              <div>
                <span className="text-black">Total Present: </span>
                <span className="inline-block border-b border-black w-20"></span>
              </div>
              <div>
                <span className="text-black">Total Absent: </span>
                <span className="inline-block border-b border-black w-20"></span>
              </div>
              <div>
                <span className="text-black">Malpractice Reported: </span>
                <span className="inline-block border-b border-black w-16"></span>
              </div>
            </div>

            <div className="flex justify-between items-end pt-3 border-t border-black">
              <div className="space-y-1">
                <p className="text-[11px] text-black">Verified by Exam Cell Assistant:</p>
                <div className="h-6 border-b border-dashed border-black w-52"></div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-black">Exam Cell In-Charge Signature:</p>
                <div className="h-6 border-b border-dashed border-black w-52"></div>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[11px] text-black">Chief Superintendent Signature & Official Seal:</p>
                <div className="h-6 border-b border-dashed border-black w-60 ml-auto"></div>
              </div>
            </div>
          </div>
        }
      >
        <table className="w-full text-xs border-collapse table-fixed bg-white text-black border border-black">
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '17%' }} />
          </colgroup>
          <thead>
            <tr className="bg-white text-black border-b border-black">
              <th className="text-center py-2 px-1 font-bold border border-black">Sl.</th>
              <th className="py-2 px-2 font-bold border border-black">Room No.</th>
              <th className="py-2 px-2 font-mono font-bold border border-black">Subject Code</th>
              <th className="py-2 px-2 font-bold border border-black">Branch</th>
              <th className="text-center py-2 px-1 font-bold border border-black">Sem</th>
              <th className="text-center py-2 px-1 font-bold border border-black">Registered</th>
              <th className="text-center py-2 px-1 font-bold border border-black">Present</th>
              <th className="text-center py-2 px-1 font-bold border border-black">Absent</th>
              <th className="py-2 px-2 font-bold border border-black">Absentee Register Numbers</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row, idx) => (
              <tr key={idx} className="handwriting-row border-b border-black bg-white">
                <td className="text-center text-black font-medium border border-black">{idx + 1}</td>
                <td className="font-bold text-black border border-black px-2 truncate">{row.roomName}</td>
                <td className="font-mono font-bold text-black border border-black px-2 truncate">{row.subjectCode}</td>
                <td className="font-medium text-black border border-black px-2 truncate">{row.branch}</td>
                <td className="text-center text-black border border-black">{row.semester}</td>
                <td className="text-center font-bold text-black border border-black">{row.registeredCount}</td>
                <td className="border border-black bg-white text-center"></td>
                <td className="border border-black bg-white text-center"></td>
                <td className="border border-black bg-white text-center"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintContainer>
    </div>
  );
};
