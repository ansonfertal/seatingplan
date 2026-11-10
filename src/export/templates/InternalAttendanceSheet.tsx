import React from 'react';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat } from '../../models/arrangement';
import type { Exam, ExamDetails } from '../../models/exam';
import { PrintContainer } from './PrintContainer';
import { generateCode39Svg } from '../../utils/barcodeGenerator';

export type InternalAttendanceSheetProps = {
  exam: Exam | ExamDetails;
  rooms: Room[];
  assignments: AssignedSeat[];
  students: ExamCandidate[];
  targetRoomId?: string;
};

/**
 * Attendance Sheet for Internal Examinations (Strictly Monochrome Black & White)
 * Contains columns: Sl. No., Roll No., Name, Subject Code, Main Sheets, Additional Sheets, Signature
 */
export const InternalAttendanceSheet: React.FC<InternalAttendanceSheetProps> = ({
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
        // Collect and sort assignments for this room by roll/register number
        const roomAssignments = assignments
          .filter((a) => a.roomId === room.id || a.classroomId === room.id)
          .map((a) => {
            const studentId = a.studentId || a.candidateId;
            const candidate = studentId ? studentMap.get(studentId) : undefined;
            return { assignment: a, candidate };
          })
          .filter((item) => Boolean(item.candidate))
          .sort((a, b) => {
            const regA = a.candidate?.rollNo || a.candidate?.registerNumber || '';
            const regB = b.candidate?.rollNo || b.candidate?.registerNumber || '';
            return regA.localeCompare(regB, undefined, {
              numeric: true,
              sensitivity: 'base',
            });
          });

        if (roomAssignments.length === 0) return null;

        // 22 candidates per page for spacious handwriting cells and zero text overlap
        const pageSize = 22;
        const totalPages = Math.ceil(roomAssignments.length / pageSize) || 1;
        const pages = Array.from({ length: totalPages }, (_, i) =>
          roomAssignments.slice(i * pageSize, (i + 1) * pageSize)
        );

        return pages.map((pageCandidates, pageIdx) => (
          <PrintContainer
            key={`${room.id}-att-internal-page-${pageIdx}`}
            orientation="portrait"
            documentTitle="INTERNAL EXAMINATION ATTENDANCE SHEET"
            documentSubtitle={`Hall: ${room.name} — Continuous Assessment Answer Booklets & Attendance Record`}
            exam={exam}
            roomName={room.name}
            pageNumber={pageIdx + 1}
            totalPages={totalPages}
            footerContent={
              <div className="border border-black bg-white p-3 text-xs text-black">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-[11px]">
                  <div>
                    <span className="text-black">Registered: </span>
                    <strong className="text-black font-bold">{roomAssignments.length}</strong>
                  </div>
                  <div>
                    <span className="text-black">Present: </span>
                    <span className="inline-block border-b border-black w-14"></span>
                  </div>
                  <div>
                    <span className="text-black">Absent: </span>
                    <span className="inline-block border-b border-black w-14"></span>
                  </div>
                  <div>
                    <span className="text-black">Main Sheets: </span>
                    <span className="inline-block border-b border-black w-14"></span>
                  </div>
                  <div>
                    <span className="text-black">Addl. Sheets: </span>
                    <span className="inline-block border-b border-black w-14"></span>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-2.5 border-t border-black text-[11px]">
                  <div className="space-y-1">
                    <p className="text-black">
                      Invigilator Signature{room.invigilators?.[0] ? ` (${room.invigilators[0]})` : ''}:
                    </p>
                    <div className="h-5 border-b border-dashed border-black w-48"></div>
                  </div>
                  {room.invigilators?.[1] && (
                    <div className="space-y-1">
                      <p className="text-black">
                        Invigilator 2 Signature ({room.invigilators[1]}):
                      </p>
                      <div className="h-5 border-b border-dashed border-black w-48"></div>
                    </div>
                  )}
                  <div className="space-y-1 text-right">
                    <p className="text-black">
                      Internal Exam Coordinator / HOD:
                    </p>
                    <div className="h-5 border-b border-dashed border-black w-44 ml-auto"></div>
                  </div>
                </div>
              </div>
            }
          >
            <table className="w-full text-xs border-collapse table-fixed bg-white text-black border border-black">
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr className="bg-white text-black border-b border-black">
                  <th className="text-center py-2 px-1 font-bold border border-black">Sl. No.</th>
                  <th className="py-2 px-2 font-bold border border-black">Roll No.</th>
                  <th className="py-2 px-2 font-bold border border-black">Name</th>
                  <th className="text-center py-2 px-1 font-bold border border-black">Subject Code</th>
                  <th className="text-center py-2 px-1 font-bold border border-black leading-tight">
                    Main Sheets
                  </th>
                  <th className="text-center py-2 px-1 font-bold border border-black leading-tight">
                    Additional Sheets
                  </th>
                  <th className="text-center py-2 px-1 font-bold border border-black">Signature</th>
                </tr>
              </thead>
              <tbody>
                {pageCandidates.map(({ candidate }, idx) => {
                  const globalIdx = pageIdx * pageSize + idx + 1;
                  const rollDisplay = candidate?.rollNo || candidate?.registerNumber || '';

                  return (
                    <tr key={candidate?.id || idx} className="handwriting-row border-b border-black bg-white">
                      <td className="text-center font-medium text-black border border-black py-1.5">{globalIdx}</td>
                      <td className="font-mono font-bold text-black border border-black px-2 py-1 overflow-hidden">
                        <div className="truncate leading-tight">{rollDisplay}</div>
                        {rollDisplay && (
                          <div
                            className="mt-0.5"
                            dangerouslySetInnerHTML={{
                              __html: generateCode39Svg(rollDisplay, {
                                height: 12,
                                narrowWidth: 0.65,
                                wideWidth: 1.5,
                                displayValue: false,
                              }),
                            }}
                          />
                        )}
                      </td>
                      <td className="font-medium text-black border border-black px-2 py-1 overflow-hidden">
                        <div className="truncate leading-tight">{candidate?.name}</div>
                      </td>
                      <td className="text-center font-mono font-semibold text-black border border-black px-1 py-1">
                        <div className="truncate">{candidate?.subjectCode || '-'}</div>
                      </td>
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

