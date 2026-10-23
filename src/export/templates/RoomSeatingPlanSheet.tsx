import React from 'react';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat } from '../../models/arrangement';
import type { Exam, ExamDetails } from '../../models/exam';
import { PrintContainer } from './PrintContainer';

export type RoomSeatingPlanSheetProps = {
  exam: Exam | ExamDetails;
  rooms: Room[];
  assignments: AssignedSeat[];
  students: ExamCandidate[];
  targetRoomId?: string;
};

/**
 * Room Seating Plan Diagram Sheet (Strictly Monochrome Black & White)
 * Guarantees single-page fit per room with zero row or text overlaps.
 */
export const RoomSeatingPlanSheet: React.FC<RoomSeatingPlanSheetProps> = ({
  exam,
  rooms,
  assignments,
  students,
  targetRoomId,
}) => {
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const activeRooms = targetRoomId ? rooms.filter((r) => r.id === targetRoomId) : rooms;

  return (
    <div className="space-y-6 room-seating-plan-wrapper bg-white">
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 5mm 6mm !important;
          }
        }
      `}</style>
      {activeRooms.map((room) => {
        // Build map for fast seat lookup: `${row}|${col}|${pos}`
        const seatLookup = new Map<string, ExamCandidate | undefined>();
        assignments
          .filter((a) => a.roomId === room.id || a.classroomId === room.id)
          .forEach((a) => {
            const pos = a.position ?? a.seatIndex;
            const key = `${a.row}|${a.column}|${pos}`;
            const sId = a.studentId || a.candidateId;
            const candidate = sId ? studentMap.get(sId) : undefined;
            seatLookup.set(key, candidate);
          });

        const perBench = room.studentsPerBench ?? 2;
        const assignedCandidatesCount = Array.from(seatLookup.values()).filter(Boolean).length;
        const totalCapacity = room.usableCapacity ?? room.maxCapacity ?? (room.rows * room.columns * perBench);

        // Dynamic typography based on row count to ensure zero text or row overlaps
        const isVeryDense = room.rows > 8;
        const isDense = room.rows > 5 && room.rows <= 8;

        const cellPad = isVeryDense ? 'p-0.5' : isDense ? 'p-0.5 sm:p-1' : 'p-1';
        const seatPad = isVeryDense ? 'p-0.5' : isDense ? 'p-0.5' : 'p-1';
        const regTextClass = isVeryDense
          ? 'text-[7px]'
          : isDense
          ? 'text-[8px]'
          : 'text-[9.5px]';
        const infoTextClass = isVeryDense
          ? 'text-[6px]'
          : isDense
          ? 'text-[7px]'
          : 'text-[8px]';

        return (
          <PrintContainer
            key={`${room.id}-plan`}
            orientation="landscape"
            fitSinglePage={true}
            compactHeader={true}
            hideStandardFooter={true}
            documentTitle="ROOM SEATING PLAN DIAGRAM"
            documentSubtitle={`HALL: ${room.name.toUpperCase()} — BENCH & POSITION MAP`}
            exam={exam}
            roomName={room.name}
            className="fit-single-page bg-white text-black"
            footerContent={
              <div className="border border-black bg-white px-2.5 py-1 text-[10px] text-black shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-bold text-black leading-tight">
                      Legend: Seat 1 is Leftmost facing front board • Hall Occupancy: {assignedCandidatesCount} occupied / {totalCapacity} capacity ({totalCapacity - assignedCandidatesCount} empty)
                    </p>
                    <p className="text-[9px] text-black leading-tight">
                      Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Official Examination Record
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="font-bold text-black text-[10px]">Superintendent Verification:</span>
                    <div className="h-4 border-b border-dashed border-black w-36"></div>
                  </div>
                </div>
              </div>
            }
          >
            {/* Front Board / Podium Indicator (Monochrome) */}
            <div className="mx-auto mb-1 max-w-sm rounded border border-black bg-white py-0.5 px-3 text-center shrink-0">
              <span className="text-[9px] font-black tracking-widest text-black uppercase">
                ▲ FRONT BOARD / TEACHER'S DESK / ENTRANCE ▲
              </span>
            </div>

            {/* Spatial Bench Matrix - Strict Fixed Layout & Zero Overlap */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden my-0.5 bg-white">
              <table className="w-full h-full border-collapse table-fixed bg-white">
                <tbody>
                  {Array.from({ length: room.rows }, (_, rowIndex) => (
                    <tr
                      key={`row-${rowIndex}`}
                      style={{ height: `${100 / room.rows}%` }}
                      className="border-b border-black"
                    >
                      {Array.from({ length: room.columns }, (_, colIndex) => {
                        const isBenchBlocked = room.blockedBenches?.some(
                          (b) => b.row === rowIndex && b.column === colIndex
                        );

                        return (
                          <td
                            key={`bench-${rowIndex}-${colIndex}`}
                            className={`border border-black ${cellPad} align-top bg-white h-full overflow-hidden`}
                            style={{
                              width: `${100 / room.columns}%`,
                              height: `${100 / room.rows}%`,
                              boxSizing: 'border-box',
                            }}
                          >
                            <div className="flex flex-col h-full justify-between overflow-hidden">
                              <div className="flex items-center justify-between text-[8px] font-bold text-black border-b border-black pb-0.5 shrink-0 leading-none">
                                <span>R{rowIndex + 1}-C{colIndex + 1}</span>
                              </div>

                              {isBenchBlocked ? (
                                <div className="flex-1 flex items-center justify-center text-[9px] font-bold text-black italic bg-white my-0.5 rounded border border-dashed border-black">
                                  BLOCKED BENCH
                                </div>
                              ) : (
                                <div
                                  className="grid gap-0.5 flex-1 min-h-0 items-stretch mt-0.5 overflow-hidden"
                                  style={{
                                    gridTemplateColumns: `repeat(${perBench}, 1fr)`,
                                  }}
                                >
                                  {Array.from({ length: perBench }, (_, seatIndex) => {
                                    const isSeatDisabled = room.disabledSeats?.some(
                                      (s) => s.row === rowIndex && s.column === colIndex && s.seatIndex === seatIndex
                                    );
                                    const key = `${rowIndex}|${colIndex}|${seatIndex}`;
                                    const candidate = seatLookup.get(key);

                                    return (
                                      <div
                                        key={`pos-${seatIndex}`}
                                        className={`rounded border border-black ${seatPad} text-center flex flex-col justify-center overflow-hidden bg-white text-black`}
                                      >
                                        <span className="block text-[7px] font-bold text-black uppercase leading-none">
                                          P{seatIndex + 1}
                                        </span>
                                        {isSeatDisabled ? (
                                          <span className="text-[7px] text-black italic leading-none">Blocked</span>
                                        ) : candidate ? (
                                          <div className="leading-tight mt-0.5 overflow-hidden">
                                            <p className={`font-mono font-black text-black truncate ${regTextClass} leading-tight`}>
                                              {candidate.registerNumber}
                                            </p>
                                            <p className={`font-bold text-black truncate ${infoTextClass} leading-tight`}>
                                              {candidate.branch} {candidate.subjectCode ? `• ${candidate.subjectCode}` : ''}
                                            </p>
                                          </div>
                                        ) : (
                                          <span className="text-[7px] text-black italic leading-none">Empty</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PrintContainer>
        );
      })}
    </div>
  );
};
