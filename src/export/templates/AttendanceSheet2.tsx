import React from 'react';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat } from '../../models/arrangement';
import type { Exam, ExamDetails } from '../../models/exam';
import { PrintContainer } from './PrintContainer';
import { generateCode39Svg } from '../../utils/barcodeGenerator';

export type AttendanceSheet2Props = {
  exam: Exam | ExamDetails;
  rooms: Room[];
  assignments: AssignedSeat[];
  students: ExamCandidate[];
  targetRoomId?: string;
};

export const AttendanceSheet2: React.FC<AttendanceSheet2Props> = ({
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
        // Collect and sort assignments by register number for official tracking
        const roomAssignments = assignments
          .filter((a) => a.roomId === room.id || a.classroomId === room.id)
          .map((a) => {
            const studentId = a.studentId || a.candidateId;
            const candidate = studentId ? studentMap.get(studentId) : undefined;
            return { assignment: a, candidate };
          })
          .filter((item) => Boolean(item.candidate))
          .sort((a, b) =>
            (a.candidate?.registerNumber || '').localeCompare(b.candidate?.registerNumber || '')
          );

        if (roomAssignments.length === 0) return null;

        const pageSize = 24;
        const totalPages = Math.ceil(roomAssignments.length / pageSize) || 1;
        const pages = Array.from({ length: totalPages }, (_, i) =>
          roomAssignments.slice(i * pageSize, (i + 1) * pageSize)
        );

        return pages.map((pageCandidates, pageIdx) => (
          <PrintContainer
            key={`${room.id}-att2-page-${pageIdx}`}
            orientation="portrait"
            documentTitle="ATTENDANCE SHEET #2 — ANSWER BOOKLET REGISTER"
            documentSubtitle={`Hall: ${room.name} — Main & Additional Sheet Accountability`}
            exam={exam}
            roomName={room.name}
            pageNumber={pageIdx + 1}
            totalPages={totalPages}
            footerContent={
              <div className="border border-slate-700 bg-slate-50 p-3 text-xs">
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div>
                    <span className="text-slate-600">Main Books Issued: </span>
                    <span className="inline-block border-b border-slate-700 w-12"></span>
                  </div>
                  <div>
                    <span className="text-slate-600">Additional Issued: </span>
                    <span className="inline-block border-b border-slate-700 w-12"></span>
                  </div>
                  <div>
                    <span className="text-slate-600">Damaged / Cancelled: </span>
                    <span className="inline-block border-b border-slate-700 w-12"></span>
                  </div>
                  <div>
                    <span className="text-slate-600">Unused Returned: </span>
                    <span className="inline-block border-b border-slate-700 w-12"></span>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-slate-300">
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-500">Hall Invigilator Signature:</p>
                    <div className="h-6 border-b border-dashed border-slate-400 w-48"></div>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[11px] text-slate-500">Exam Cell Verification Stamp:</p>
                    <div className="h-6 border-b border-dashed border-slate-400 w-48 ml-auto"></div>
                  </div>
                </div>
              </div>
            }
          >
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="w-10 text-center">Sl.</th>
                  <th className="w-32">Register No.</th>
                  <th>Student Name</th>
                  <th className="w-32 text-center">Main Booklet No.</th>
                  <th className="w-36 text-center">Additional Sheet Nos.</th>
                  <th className="w-20 text-center">Total Sheets</th>
                  <th className="w-32 text-center">Student Signature</th>
                </tr>
              </thead>
              <tbody>
                {pageCandidates.map(({ candidate }, idx) => {
                  const globalIdx = pageIdx * pageSize + idx + 1;
                  return (
                    <tr key={candidate?.id || idx} className="handwriting-row">
                      <td className="text-center text-slate-600">{globalIdx}</td>
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
                      <td className="bg-slate-50/20"></td>
                      <td className="bg-slate-50/20"></td>
                      <td className="bg-slate-50/20 text-center"></td>
                      <td className="bg-slate-50/20"></td>
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
