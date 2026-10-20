import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Ban, ArrowLeftRight, Eye } from 'lucide-react';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat } from '../../models/arrangement';
import { BenchDetailPopover } from './BenchDetailPopover';
import type { SeatPositionRef } from '../../algorithms/swapValidator';

export type RoomVisualReviewProps = {
  rooms: Room[];
  assignments: AssignedSeat[];
  students: ExamCandidate[];
  activeRoomId?: string;
  onActiveRoomChange: (roomId: string) => void;
  highlightedSeat?: { roomId: string; row: number; column: number; seatIndex: number };
  onInitiateSwapWithSeats?: (fromSeat: SeatPositionRef, toSeat: SeatPositionRef) => void;
  isLocked?: boolean;
};

export const RoomVisualReview: React.FC<RoomVisualReviewProps> = ({
  rooms,
  assignments,
  students,
  activeRoomId,
  onActiveRoomChange,
  highlightedSeat,
  onInitiateSwapWithSeats,
  isLocked = false,
}) => {
  const [selectedBench, setSelectedBench] = useState<{ row: number; column: number } | null>(null);
  const [pendingSourceSeat, setPendingSourceSeat] = useState<SeatPositionRef | null>(null);

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === (activeRoomId || rooms[0]?.id)) || rooms[0],
    [rooms, activeRoomId]
  );

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Group assignments for the active room into a lookup map: `${row}|${col}|${pos}`
  const roomSeatsMap = useMemo(() => {
    const map = new Map<string, { assignment: AssignedSeat; candidate?: ExamCandidate }>();
    if (!activeRoom) return map;

    assignments.forEach((a) => {
      if (a.roomId === activeRoom.id || a.classroomId === activeRoom.id) {
        const pos = a.position ?? a.seatIndex;
        const key = `${a.row}|${a.column}|${pos}`;
        const studentId = a.studentId || a.candidateId;
        const candidate = studentId ? studentMap.get(studentId) : undefined;
        map.set(key, { assignment: a, candidate });
      }
    });
    return map;
  }, [activeRoom, assignments, studentMap]);

  // Count occupancy per room
  const roomOccupancyCounts = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach((a) => {
      const rId = a.roomId || a.classroomId;
      if (rId) map.set(rId, (map.get(rId) || 0) + 1);
    });
    return map;
  }, [assignments]);

  // Auto-scroll to highlighted seat when changed
  const seatRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (highlightedSeat && highlightedSeat.roomId === activeRoom?.id && seatRef.current) {
      seatRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedSeat, activeRoom]);

  if (!activeRoom) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        No active examination rooms configured.
      </div>
    );
  }

  const handleSeatClick = (row: number, column: number, seatIndex: number, isBlocked: boolean) => {
    if (isBlocked) return;

    const clickedSeatRef: SeatPositionRef = {
      roomId: activeRoom.id,
      row,
      column,
      seatIndex,
    };

    if (isLocked) {
      // Just open bench inspector
      setSelectedBench({ row, column });
      return;
    }

    if (!pendingSourceSeat) {
      // If clicking an occupied seat, select it as pending source for quick swap
      const key = `${row}|${column}|${seatIndex}`;
      const seatData = roomSeatsMap.get(key);
      if (seatData?.candidate) {
        setPendingSourceSeat(clickedSeatRef);
      } else {
        // If clicking empty seat with no source selected, open bench popover
        setSelectedBench({ row, column });
      }
    } else {
      // If a source seat is already pending:
      if (
        pendingSourceSeat.roomId === clickedSeatRef.roomId &&
        pendingSourceSeat.row === clickedSeatRef.row &&
        pendingSourceSeat.column === clickedSeatRef.column &&
        pendingSourceSeat.seatIndex === clickedSeatRef.seatIndex
      ) {
        // Clicked the same seat: deselect
        setPendingSourceSeat(null);
      } else {
        // Clicked a second seat: launch swap modal with both!
        if (onInitiateSwapWithSeats) {
          onInitiateSwapWithSeats(pendingSourceSeat, clickedSeatRef);
        }
        setPendingSourceSeat(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Room Tabs & Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {rooms.map((room) => {
            const count = roomOccupancyCounts.get(room.id) || 0;
            const maxCap = room.usableCapacity ?? room.maxCapacity ?? (room.rows * room.columns * room.studentsPerBench);
            const isActive = room.id === activeRoom.id;

            return (
              <button
                key={room.id}
                onClick={() => {
                  onActiveRoomChange(room.id);
                  setPendingSourceSeat(null);
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{room.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count} / {maxCap}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Help / Instructions */}
        {pendingSourceSeat ? (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 border border-amber-200 animate-pulse">
            <ArrowLeftRight className="w-4 h-4 text-amber-600" />
            <span>Click any target seat to initiate swap/move with selected candidate.</span>
            <button
              onClick={() => setPendingSourceSeat(null)}
              className="ml-2 underline text-amber-900 hover:text-amber-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Click any seat to move/swap • Click bench header to inspect all occupants
          </span>
        )}
      </div>

      {/* Front Board / Orientation Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto mb-8 max-w-md rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-2.5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            ▲ FRONT BOARD / TEACHER'S DESK (SCREEN / ENTRANCE) ▲
          </p>
        </div>

        {/* Visual Bench Grid */}
        <div className="overflow-x-auto pb-4">
          <div
            className="inline-grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${activeRoom.columns}, minmax(180px, 1fr))`,
            }}
          >
            {Array.from({ length: Math.max(activeRoom.rows, ...(activeRoom.columnRows || [activeRoom.rows])) }, (_, rowIndex) =>
              Array.from({ length: activeRoom.columns }, (_, colIndex) => {
                const isBenchBlocked = activeRoom.blockedBenches?.some(
                  (b) => b.row === rowIndex && b.column === colIndex
                );

                return (
                  <div
                    key={`bench-${rowIndex}-${colIndex}`}
                    className={`flex flex-col rounded-xl border transition-all ${
                      isBenchBlocked
                        ? 'border-slate-200 bg-slate-100/70 p-2'
                        : 'border-slate-200 bg-slate-50/40 p-2 hover:border-slate-300'
                    }`}
                  >
                    {/* Bench Header & Inspect Button */}
                    <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold text-slate-500">
                      <span>R{rowIndex + 1}-C{colIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedBench({ row: rowIndex, column: colIndex })}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                        title="Inspect bench occupants"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Seats on this bench */}
                    {isBenchBlocked ? (
                      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100/80 text-xs font-semibold text-slate-400">
                        <Ban className="mr-1.5 h-4 w-4" /> Blocked Bench
                      </div>
                    ) : (
                      <div
                        className="grid gap-1.5"
                        style={{
                          gridTemplateColumns: `repeat(${activeRoom.studentsPerBench}, 1fr)`,
                        }}
                      >
                        {Array.from({ length: activeRoom.studentsPerBench }, (_, seatIndex) => {
                          const isSeatDisabled = activeRoom.disabledSeats?.some(
                            (s) => s.row === rowIndex && s.column === colIndex && s.seatIndex === seatIndex
                          );

                          const key = `${rowIndex}|${colIndex}|${seatIndex}`;
                          const seatData = roomSeatsMap.get(key);
                          const candidate = seatData?.candidate;

                          const isHighlighted =
                            highlightedSeat?.roomId === activeRoom.id &&
                            highlightedSeat?.row === rowIndex &&
                            highlightedSeat?.column === colIndex &&
                            highlightedSeat?.seatIndex === seatIndex;

                          const isPendingSource =
                            pendingSourceSeat?.roomId === activeRoom.id &&
                            pendingSourceSeat?.row === rowIndex &&
                            pendingSourceSeat?.column === colIndex &&
                            pendingSourceSeat?.seatIndex === seatIndex;

                          const seatLabel = isSeatDisabled
                            ? `Room ${activeRoom.name}, Bench R${rowIndex + 1}-C${colIndex + 1}, Position ${seatIndex + 1}: Blocked Seat`
                            : candidate
                            ? `Room ${activeRoom.name}, Bench R${rowIndex + 1}-C${colIndex + 1}, Position ${seatIndex + 1}: Occupied by ${candidate.name}, ${candidate.registerNumber}, ${candidate.branch}`
                            : `Room ${activeRoom.name}, Bench R${rowIndex + 1}-C${colIndex + 1}, Position ${seatIndex + 1}: Empty Seat`;

                          return (
                            <div
                              key={`seat-${seatIndex}`}
                              ref={isHighlighted ? seatRef : null}
                              role="button"
                              tabIndex={isSeatDisabled ? -1 : 0}
                              aria-label={seatLabel}
                              aria-pressed={isPendingSource}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleSeatClick(rowIndex, colIndex, seatIndex, Boolean(isSeatDisabled));
                                }
                              }}
                              onClick={() => handleSeatClick(rowIndex, colIndex, seatIndex, Boolean(isSeatDisabled))}
                              className={`group relative flex flex-col justify-between rounded-lg border p-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                                isSeatDisabled
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100/60 text-slate-400'
                                  : isPendingSource
                                  ? 'cursor-pointer border-amber-400 bg-amber-50 ring-2 ring-amber-400 shadow-md'
                                  : isHighlighted
                                  ? 'cursor-pointer border-indigo-500 bg-indigo-50 ring-4 ring-indigo-400/50 shadow-lg animate-pulse'
                                  : candidate
                                  ? 'cursor-pointer border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md'
                                  : 'cursor-pointer border-dashed border-slate-300 bg-white/40 hover:bg-indigo-50/30'
                              }`}
                            >
                              {/* Position tag */}
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                <span>P{seatIndex + 1}</span>
                                {candidate && (
                                  <span className="rounded bg-indigo-50 px-1 py-0.2 text-[9px] font-bold text-indigo-700">
                                    {candidate.branch}
                                  </span>
                                )}
                              </div>

                              {/* Candidate Info or Empty State */}
                              <div className="my-1">
                                {isSeatDisabled ? (
                                  <div className="py-2 text-center text-[10px] text-slate-400">
                                    <Ban className="mx-auto h-3 w-3 mb-0.5" />
                                    Blocked
                                  </div>
                                ) : candidate ? (
                                  <div className="space-y-0.5">
                                    <p className="font-mono text-xs font-bold text-slate-900 truncate">
                                      {candidate.registerNumber}
                                    </p>
                                    <p className="text-[10px] text-slate-600 truncate font-medium">
                                      {candidate.name}
                                    </p>
                                    <span className="inline-block rounded bg-purple-50 px-1 py-0.2 font-mono text-[9px] font-semibold text-purple-700 border border-purple-200 truncate max-w-full">
                                      {candidate.subjectCode}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="py-2.5 text-center text-[10px] font-medium text-slate-400 italic">
                                    Empty
                                  </div>
                                )}
                              </div>

                              {/* Hover Indicator for swap */}
                              {!isSeatDisabled && !isLocked && (
                                <div className="hidden group-hover:flex items-center justify-center pt-1 border-t border-slate-100 text-[10px] text-indigo-600 font-semibold">
                                  {pendingSourceSeat
                                    ? isPendingSource
                                      ? 'Selected'
                                      : 'Swap here'
                                    : candidate
                                    ? 'Move'
                                    : 'Move here'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-slate-200 bg-white shadow-xs" />
              <span>Occupied Seat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-dashed border-slate-300 bg-white/50" />
              <span>Empty / Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-slate-200 bg-slate-100 text-slate-400" />
              <span>Blocked Seat / Bench</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded border border-amber-400 bg-amber-50 ring-1 ring-amber-400" />
              <span>Selected for Move</span>
            </div>
          </div>

          <div className="text-slate-400 text-[11px]">
            Rooms sorted in configured allocation order (PRD Section 4.5)
          </div>
        </div>
      </div>

      {/* Bench Detail Popover */}
      {selectedBench && (
        <BenchDetailPopover
          isOpen={Boolean(selectedBench)}
          onClose={() => setSelectedBench(null)}
          room={activeRoom}
          row={selectedBench.row}
          column={selectedBench.column}
          assignments={assignments}
          students={students}
          isLocked={isLocked}
          onInitiateSwap={(seat) => {
            setPendingSourceSeat(seat);
          }}
        />
      )}
    </div>
  );
};
