import React from 'react';
import { X, ArrowLeftRight, AlertTriangle, CheckCircle, ShieldAlert, Ban } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat } from '../../models/arrangement';

export type BenchDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  row: number;
  column: number;
  assignments: AssignedSeat[];
  students: ExamCandidate[];
  onInitiateSwap: (seat: { roomId: string; row: number; column: number; seatIndex: number }) => void;
  isLocked?: boolean;
};

export const BenchDetailPopover: React.FC<BenchDetailModalProps> = ({
  isOpen,
  onClose,
  room,
  row,
  column,
  assignments,
  students,
  onInitiateSwap,
  isLocked = false,
}) => {
  if (!isOpen) return null;

  const studentMap = new Map(students.map((s) => [s.id, s]));

  const benchSeats = Array.from({ length: room.studentsPerBench }, (_, seatIndex) => {
    const isSeatDisabled = room.disabledSeats?.some(
      (s) => s.row === row && s.column === column && s.seatIndex === seatIndex
    );
    const isBenchBlocked = room.blockedBenches?.some((b) => b.row === row && b.column === column);
    const assignment = assignments.find(
      (a) =>
        (a.roomId === room.id || a.classroomId === room.id) &&
        a.row === row &&
        a.column === column &&
        (a.position ?? a.seatIndex) === seatIndex
    );

    const studentId = assignment?.studentId || assignment?.candidateId;
    const candidate = studentId ? studentMap.get(studentId) : undefined;

    return {
      seatIndex,
      isBlocked: Boolean(isSeatDisabled || isBenchBlocked),
      assignment,
      candidate,
    };
  });

  // Check pairwise conflicts on this bench
  const occupiedCandidates = benchSeats.map((s) => s.candidate).filter(Boolean) as ExamCandidate[];
  let conflictReason: string | null = null;
  for (let i = 0; i < occupiedCandidates.length; i++) {
    for (let j = i + 1; j < occupiedCandidates.length; j++) {
      const a = occupiedCandidates[i];
      const b = occupiedCandidates[j];
      const subA = (a.subjectCode || '').trim().toLowerCase();
      const subB = (b.subjectCode || '').trim().toLowerCase();
      if (subA && subB && subA === subB) {
        conflictReason = `Constraint C2: Occupants share subject code "${a.subjectCode}"`;
        break;
      }
      const branchA = (a.branch || '').trim().toLowerCase();
      const branchB = (b.branch || '').trim().toLowerCase();
      const semA = (a.semester || '').trim().toLowerCase();
      const semB = (b.semester || '').trim().toLowerCase();
      if (branchA && branchB && branchA === branchB && semA && semB && semA === semB) {
        conflictReason = `Constraint C3: Occupants share branch "${a.branch}" and semester "${a.semester}"`;
        break;
      }
    }
    if (conflictReason) break;
  }

  const getSeatPositionName = (idx: number, total: number) => {
    if (total === 1) return 'Sole Position';
    if (total === 2) return idx === 0 ? 'Left (Pos 1)' : 'Right (Pos 2)';
    if (total === 3) {
      if (idx === 0) return 'Left (Pos 1)';
      if (idx === 1) return 'Center (Pos 2)';
      return 'Right (Pos 3)';
    }
    return `Seat ${idx + 1}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Bench Inspector (PRD Section 4.6)
              </span>
              {conflictReason ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  <ShieldAlert className="w-3.5 h-3.5" /> Conflict
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle className="w-3.5 h-3.5" /> Compliant
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {room.name} — Bench (Row {row + 1}, Col {column + 1})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Alert if any */}
        {conflictReason && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-2.5 flex items-center gap-2 text-xs font-medium text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{conflictReason}</span>
          </div>
        )}

        {/* Bench Occupants Grid */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 font-medium">
            Bench Capacity: {room.studentsPerBench} student{room.studentsPerBench > 1 ? 's' : ''} (Pairwise C2/C3 separation enforced)
          </p>

          <div className="grid gap-3">
            {benchSeats.map(({ seatIndex, isBlocked, candidate }) => (
              <div
                key={seatIndex}
                className={`rounded-xl border p-4 transition-all ${
                  isBlocked
                    ? 'border-slate-200 bg-slate-50 text-slate-400'
                    : candidate
                    ? 'border-indigo-100 bg-indigo-50/30'
                    : 'border-dashed border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-200/80 px-2 py-0.5 text-xs font-bold text-slate-700 uppercase">
                      {getSeatPositionName(seatIndex, room.studentsPerBench)}
                    </span>
                    {isBlocked && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                        <Ban className="w-3 h-3" /> Blocked
                      </span>
                    )}
                  </div>

                  {!isBlocked && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLocked}
                      onClick={() => {
                        onClose();
                        onInitiateSwap({ roomId: room.id, row, column, seatIndex });
                      }}
                      className="text-xs h-7 px-2.5 flex items-center gap-1.5"
                    >
                      <ArrowLeftRight className="w-3 h-3 text-indigo-600" />
                      {candidate ? 'Move / Swap' : 'Move Candidate Here'}
                    </Button>
                  )}
                </div>

                <div className="mt-2.5">
                  {candidate ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <p className="font-mono text-base font-bold text-slate-900">
                          {candidate.registerNumber}
                        </p>
                        <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">
                          {candidate.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800">
                          Branch: {candidate.branch}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 font-semibold text-purple-800">
                          Sem: {candidate.semester}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                          Paper: {candidate.subjectCode}
                        </span>
                      </div>
                    </div>
                  ) : isBlocked ? (
                    <p className="text-xs text-slate-400 italic">This seat position is blocked by classroom layout.</p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Empty seat. Candidate can be moved here.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
};
