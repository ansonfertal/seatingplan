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
  targetRoomId?: string;
};

/**
 * Attendance Sheet 1 (Strictly Monochrome Black & White)
 * Contains columns: Register Number, Name of Student, Number of Main Sheets, Alpha Code, Serial Number, Signature
 */
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
    <div className="space-y-8 bg-white">
      {activeRooms.map((room) => {
        // Collect and sort assignments for this room by register number
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

        // 22 candidates per page for ample, non-overlapping handwriting row spacing
        const pageSize = 22;
        const totalPages = Math.ceil(roomAssignments.length / pageSize) || 1;
        const pages = Array.from({ length: totalPages }, (_, i) =>
          roomAssignments.slice(i * pageSize, (i + 1) * pageSize)
        );

        return pages.map((pageCandidates, pageIdx) => (
          <PrintContainer
            key={`${room.id}-att1-page-${pageIdx}`}
            orientation="portrait"
            documentTitle="ATTENDANCE SHEET 1"
            documentSubtitle={`Hall: ${room.name} — Main Sheets & Booklet Accountability`}
            exam={exam}
            roomName={room.name}
            pageNumber={pageIdx + 1}
            totalPages={totalPages}
            footerContent={
              <div className="border border-black bg-white p-3 text-xs text-black">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <span className="text-black">Total Registered: </span>
                    <strong className="text-black font-bold">{roomAssignments.length}</strong>
                  </div>
                  <div>
                    <span className="text-black">Present: </span>
                    <span className="inline-block border-b border-black w-20"></span>
                  </div>
                  <div>
                    <span className="text-black">Absent: </span>
                    <span className="inline-block border-b border-black w-20"></span>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-black">
                  <div className="space-y-1">
                    <p className="text-[11px] text-black">
                      Invigilator 1 Signature{room.invigilators?.[0] ? ` (${room.invigilators[0]})` : ''}:
                    </p>
                    <div className="h-6 border-b border-dashed border-black w-48"></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-black">
                      Invigilator 2 Signature{room.invigilators?.[1] ? ` (${room.invigilators[1]})` : ''}:
                    </p>
                    <div className="h-6 border-b border-dashed border-black w-48"></div>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[11px] text-black">
                      Chief Superintendent Signature{exam.adminName ? ` (${exam.adminName})` : ''}:
                    </p>
                    <div className="h-6 border-b border-dashed border-black w-44 ml-auto"></div>
                  </div>
                </div>
              </div>
            }
          >
            <table className="w-full text-xs border-collapse table-fixed bg-white text-black border border-black">
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>
              <thead>
                <tr className="bg-white text-black border-b border-black">
                  <th className="text-center py-2 px-1 font-bold border border-black">Sl. No.</th>
                  <th className="py-2 px-2 font-bold border border-black">Register Number</th>
                  <th className="py-2 px-2 font-bold border border-black">Name of Student</th>
                  <th className="text-center py-2 px-1 font-bold border border-black leading-tight">
                    Number of Main Sheets
                  </th>
                  <th className="text-center py-2 px-1 font-bold border border-black">Alpha Code</th>
                  <th className="text-center py-2 px-1 font-bold border border-black">Serial Number</th>
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
                      <td className="border border-black bg-white text-center"></td>
                      <td className="border border-black bg-white text-center"></td>
                      <td className="border border-black bg-white text-center"></td>
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
