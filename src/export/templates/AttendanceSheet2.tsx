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

/**
 * Attendance Sheet 2 (Strictly Monochrome Black & White)
 * Contains columns: Register Number, Name, Subject Code, Signature
 */
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
    <div className="space-y-8 bg-white">
      {activeRooms.map((room) => {
        // Collect and sort assignments by register number
        const roomAssignments = assignments
          .filter((a) => a.roomId === room.id || a.classroomId === room.id)
          .map((a) => {
            const studentId = a.studentId || a.candidateId;
            const candidate = studentId ? studentMap.get(studentId) : undefined;
            return { assignment: a, candidate };
          })
          .filter((item) => Boolean(item.candidate))
          .sort((a, b) =>
            (a.candidate?.registerNumber || '').localeCompare(b.candidate?.registerNumber || '', undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          );

        if (roomAssignments.length === 0) return null;

        // 24 candidates per page with spacious handwriting cells
        const pageSize = 24;
        const totalPages = Math.ceil(roomAssignments.length / pageSize) || 1;
        const pages = Array.from({ length: totalPages }, (_, i) =>
          roomAssignments.slice(i * pageSize, (i + 1) * pageSize)
        );

        return pages.map((pageCandidates, pageIdx) => (
          <PrintContainer
            key={`${room.id}-att2-page-${pageIdx}`}
            orientation="portrait"
            documentTitle="ATTENDANCE SHEET 2"
            documentSubtitle={`Hall: ${room.name} — Candidate Subject & Signature Verification`}
            exam={exam}
            roomName={room.name}
            pageNumber={pageIdx + 1}
            totalPages={totalPages}
            footerContent={
              <div className="border border-black bg-white p-3 text-xs text-black">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <span className="text-black">Total Candidates: </span>
                    <strong className="text-black font-bold">{roomAssignments.length}</strong>
                  </div>
                  <div>
                    <span className="text-black">Present Count: </span>
                    <span className="inline-block border-b border-black w-20"></span>
                  </div>
                  <div>
                    <span className="text-black">Absent Count: </span>
                    <span className="inline-block border-b border-black w-20"></span>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-black">
                  <div className="space-y-1">
                    <p className="text-[11px] text-black">
                      Hall Invigilator Signature{room.invigilators && room.invigilators.length > 0 ? ` (${room.invigilators.join(', ')})` : ''}:
                    </p>
                    <div className="h-6 border-b border-dashed border-black w-52"></div>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[11px] text-black">
                      Exam Cell Verification / Chief Superintendent{exam.adminName ? ` (${exam.adminName})` : ''}:
                    </p>
                    <div className="h-6 border-b border-dashed border-black w-52 ml-auto"></div>
                  </div>
                </div>
              </div>
            }
          >
            <table className="w-full text-xs border-collapse table-fixed bg-white text-black border border-black">
              <colgroup>
                <col style={{ width: '8%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '32%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr className="bg-white text-black border-b border-black">
                  <th className="text-center py-2 px-1 font-bold border border-black">Sl. No.</th>
                  <th className="py-2 px-2 font-bold border border-black">Register Number</th>
                  <th className="py-2 px-2 font-bold border border-black">Name</th>
                  <th className="text-center py-2 px-1 font-bold border border-black">Subject Code</th>
                  <th className="text-center py-2 px-1 font-bold border border-black">Signature</th>
                </tr>
              </thead>
              <tbody>
                {pageCandidates.map(({ candidate }, idx) => {
                  const globalIdx = pageIdx * pageSize + idx + 1;
                  return (
                    <tr key={candidate?.id || idx} className="handwriting-row border-b border-black bg-white">
                      <td className="text-center font-medium text-black border border-black">{globalIdx}</td>
                      <td className="font-mono font-bold text-black border border-black px-2 py-1 overflow-hidden">
                        <div className="truncate leading-tight">{candidate?.registerNumber}</div>
                        {candidate?.registerNumber && (
                          <div
                            className="mt-0.5"
                            dangerouslySetInnerHTML={{
                              __html: generateCode39Svg(candidate.registerNumber, {
                                height: 14,
                                narrowWidth: 0.7,
                                wideWidth: 1.6,
                                displayValue: false,
                              }),
                            }}
                          />
                        )}
                      </td>
                      <td className="font-medium text-black border border-black px-2 py-1 overflow-hidden">
                        <div className="truncate leading-tight">{candidate?.name}</div>
                      </td>
                      <td className="text-center font-mono font-bold text-black border border-black px-2 py-1">
                        <div className="truncate leading-tight">{candidate?.subjectCode}</div>
                      </td>
                      <td className="border border-black bg-white text-center"></td>
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
