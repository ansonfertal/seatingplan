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
    <div className="space-y-6 room-seating-plan-wrapper">
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

        const assignedCandidatesCount = Array.from(seatLookup.values()).filter(Boolean).length;
        const totalCapacity = room.usableCapacity ?? room.maxCapacity ?? (room.rows * room.columns * room.studentsPerBench);

        // Dynamic typography and padding based on row/column density to fit exactly 1 page
        const isVeryDense = room.rows > 8;
        const isDense = room.rows > 5 && room.rows <= 8;

        const cellPad = isVeryDense ? 'p-0.5' : isDense ? 'p-0.5 sm:p-1' : 'p-1';
        const seatPad = isVeryDense ? 'p-0.5' : isDense ? 'p-0.5' : 'p-1';
        const regTextClass = isVeryDense
          ? 'text-[7.5px]'
          : isDense
          ? 'text-[8.5px]'
          : 'text-[9.5px]';
        const infoTextClass = isVeryDense
          ? 'text-[6.5px]'
          : isDense
          ? 'text-[7px]'
          : 'text-[7.5px]';

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
            className="fit-single-page"
            footerContent={
              <div className="border border-slate-700 bg-slate-50 px-2.5 py-1 text-[10px] shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 leading-tight">
                      Legend: Seat 1 is Leftmost facing front board • Hall Occupancy: {assignedCandidatesCount} occupied / {totalCapacity} capacity ({totalCapacity - assignedCandidatesCount} empty)
                    </p>
                    <p className="text-[9px] text-slate-500 leading-tight">
                      Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Official Institutional Examination Record
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-[10px]">Superintendent Verification:</span>
                    <div className="h-4 border-b border-dashed border-slate-600 w-36"></div>
                  </div>
                </div>
              </div>
            }
          >
            {/* Front Board / Podium Indicator */}
            <div className="mx-auto mb-1 max-w-sm rounded border border-dashed border-slate-700 bg-slate-100 py-0.5 px-3 text-center shrink-0">
              <span className="text-[9px] font-black tracking-widest text-slate-800 uppercase">
                ▲ FRONT BOARD / TEACHER'S DESK / ENTRANCE ▲
              </span>
            </div>

            {/* Spatial Bench Matrix */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden my-0.5">
              <table className="w-full h-full border-collapse table-fixed">
                <tbody>
                  {Array.from({ length: room.rows }, (_, rowIndex) => (
                    <tr
                      key={`row-${rowIndex}`}
                      style={{ height: `${100 / room.rows}%` }}
                    >
                      {Array.from({ length: room.columns }, (_, colIndex) => {
                        const isBenchBlocked = room.blockedBenches?.some(
                          (b) => b.row === rowIndex && b.column === colIndex
                        );

                        return (
                          <td
                            key={`bench-${rowIndex}-${colIndex}`}
                            className={`border border-slate-700 ${cellPad} align-top bg-white h-full`}
                            style={{
                              width: `${100 / room.columns}%`,
                              height: `${100 / room.rows}%`,
                            }}
                          >
                            <div className="flex flex-col h-full justify-between">
                              <div className="flex items-center justify-between text-[8px] font-bold text-slate-500 border-b border-slate-200 pb-0.5 shrink-0 leading-none">
                                <span>R{rowIndex + 1}-C{colIndex + 1}</span>
                              </div>

                              {isBenchBlocked ? (
                                <div className="flex-1 flex items-center justify-center text-[9px] font-semibold text-slate-400 italic bg-slate-100 my-0.5 rounded">
                                  BLOCKED BENCH
                                </div>
                              ) : (
                                <div
                                  className="grid gap-0.5 flex-1 min-h-0 items-stretch mt-0.5"
                                  style={{
                                    gridTemplateColumns: `repeat(${room.studentsPerBench}, 1fr)`,
                                  }}
                                >
                                  {Array.from({ length: room.studentsPerBench }, (_, seatIndex) => {
                                    const isSeatDisabled = room.disabledSeats?.some(
                                      (s) => s.row === rowIndex && s.column === colIndex && s.seatIndex === seatIndex
                                    );
                                    const key = `${rowIndex}|${colIndex}|${seatIndex}`;
                                    const candidate = seatLookup.get(key);

                                    return (
                                      <div
                                        key={`pos-${seatIndex}`}
                                        className={`rounded border ${seatPad} text-center flex flex-col justify-center overflow-hidden ${
                                          isSeatDisabled
                                            ? 'border-slate-300 bg-slate-100 text-slate-400'
                                            : candidate
                                            ? 'border-slate-800 bg-slate-50/70'
                                            : 'border-dashed border-slate-300 bg-white text-slate-400'
                                        }`}
                                      >
                                        <span className="block text-[7px] font-bold text-slate-400 uppercase leading-none">
                                          P{seatIndex + 1}
                                        </span>
                                        {isSeatDisabled ? (
                                          <span className="text-[7.5px] text-slate-400 italic leading-none">Blocked</span>
                                        ) : candidate ? (
                                          <div className="leading-tight mt-0.5">
                                            <p className={`font-mono font-black text-slate-950 truncate ${regTextClass}`}>
                                              {candidate.registerNumber}
                                            </p>
                                            <p className={`font-bold text-slate-700 truncate ${infoTextClass}`}>
                                              {candidate.branch} • {candidate.subjectCode}
                                            </p>
                                          </div>
                                        ) : (
                                          <span className="text-[7.5px] text-slate-400 italic leading-none">Empty</span>
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
