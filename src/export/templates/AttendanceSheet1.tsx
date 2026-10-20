import React from 'react';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat } from '../../models/arrangement';
import type { Exam, ExamDetails } from '../../models/exam';
import { PrintContainer } from './PrintContainer';
import { generateCode39Svg } from '../../utils/barcodeGenerator';

export type AttendanceSheet1Props = {
  exam: Exam | ExamDetails;
  rooms: Room[];
  assignments: AssignedSeat[];
  students: ExamCandidate[];
  targetRoomId?: string; // Optional: filter to single room or render all
};

export const AttendanceSheet1: React.FC<AttendanceSheet1Props> = ({
  exam,
  rooms,
  assignments,
  students,
  targetRoomId,
}) => {
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const activeRooms = targetRoomId ? rooms.filter((r) => r.id === targetRoomId) : rooms;

  return (
    <div className="space-y-8">
      {activeRooms.map((room) => {
        // Collect and sort assignments for this room: sorted by row, col, seatIndex, then registerNumber
        const roomAssignments = assignments
          .filter((a) => a.roomId === room.id || a.classroomId === room.id)
          .map((a) => {
            const studentId = a.studentId || a.candidateId;
            const candidate = studentId ? studentMap.get(studentId) : undefined;
            return { assignment: a, candidate };
          })
          .filter((item) => Boolean(item.candidate))
          .sort((a, b) => {
            if (a.assignment.row !== b.assignment.row) return a.assignment.row - b.assignment.row;
            if (a.assignment.column !== b.assignment.column) return a.assignment.column - b.assignment.column;
            const posA = a.assignment.position ?? a.assignment.seatIndex;
            const posB = b.assignment.position ?? b.assignment.seatIndex;
            if (posA !== posB) return posA - posB;
            return (a.candidate?.registerNumber || '').localeCompare(b.candidate?.registerNumber || '');
          });

        if (roomAssignments.length === 0) return null;

        // Chunk candidates into pages of 24 candidates each for clean pagination
        const pageSize = 24;
        const totalPages = Math.ceil(roomAssignments.length / pageSize) || 1;
        const pages = Array.from({ length: totalPages }, (_, i) =>
          roomAssignments.slice(i * pageSize, (i + 1) * pageSize)
        );

        return pages.map((pageCandidates, pageIdx) => (
          <PrintContainer
            key={`${room.id}-page-${pageIdx}`}
            orientation="portrait"
            documentTitle="ATTENDANCE SHEET #1"
            documentSubtitle={`Hall: ${room.name} — Seating Order`}
            exam={exam}
            roomName={room.name}
            pageNumber={pageIdx + 1}
            totalPages={totalPages}
            footerContent={
              <div className="border border-slate-700 bg-slate-50 p-3 text-xs">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <span className="text-slate-600">Total Registered: </span>
                    <strong className="text-slate-900">{roomAssignments.length}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">Present: </span>
                    <span className="inline-block border-b border-slate-700 w-16"></span>
                  </div>
                  <div>
                    <span className="text-slate-600">Absent: </span>
                    <span className="inline-block border-b border-slate-700 w-16"></span>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-slate-300">
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500">Invigilator 1 Name & Signature:</p>
                    <div className="h-6 border-b border-dashed border-slate-400 w-48"></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500">Invigilator 2 Name & Signature:</p>
                    <div className="h-6 border-b border-dashed border-slate-400 w-48"></div>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[11px] text-slate-500">Chief Superintendent:</p>
                    <div className="h-6 border-b border-dashed border-slate-400 w-40 ml-auto"></div>
                  </div>
                </div>
              </div>
            }
          >
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="w-10 text-center">Sl.</th>
                  <th className="w-24">Bench</th>
                  <th className="w-28">Register No.</th>
                  <th>Student Name</th>
                  <th className="w-16 text-center">Branch</th>
                  <th className="w-20 text-center">Subject</th>
                  <th className="w-28 text-center">Answer Book No.</th>
                  <th className="w-32 text-center">Student Signature</th>
                </tr>
              </thead>
              <tbody>
                {pageCandidates.map(({ assignment, candidate }, idx) => {
                  const globalIdx = pageIdx * pageSize + idx + 1;
                  const benchPos = `R${assignment.row + 1}-C${assignment.column + 1} (P${(assignment.position ?? assignment.seatIndex) + 1})`;

                  return (
                    <tr key={candidate?.id || idx} className="handwriting-row">
                      <td className="text-center text-slate-600">{globalIdx}</td>
                      <td className="font-mono text-[11px] text-slate-700">{benchPos}</td>
                      <td className="font-mono font-bold text-slate-900">
                        <div>{candidate?.registerNumber}</div>
                        {candidate?.registerNumber && (
                          <div
                            className="mt-0.5 opacity-85"
                            dangerouslySetInnerHTML={{
                              __html: generateCode39Svg(candidate.registerNumber, {
                                height: 16,
                                narrowWidth: 0.7,
                                wideWidth: 1.7,
                                displayValue: false,
                              }),
                            }}
                          />
                        )}
                      </td>
                      <td className="font-medium text-slate-800">{candidate?.name}</td>
                      <td className="text-center font-semibold text-slate-700">{candidate?.branch}</td>
                      <td className="text-center font-mono font-semibold text-slate-700">{candidate?.subjectCode}</td>
                      <td className="bg-slate-50/30"></td>
                      <td className="bg-slate-50/30"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </PrintContainer>
        ));
      })}
    </div>
  );
};
