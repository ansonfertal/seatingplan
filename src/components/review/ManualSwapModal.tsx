import React, { useMemo, useState } from 'react';
import {
  X,
  ArrowLeftRight,
  ShieldCheck,
  ShieldAlert,
  Info,
  CheckCircle,
  MapPin,
  Lock,
} from 'lucide-react';
import { Button } from '../ui/Button';
import type { Room } from '../../models/classroom';
import type { ExamCandidate } from '../../models/student';
import type { AssignedSeat, ValidationReport, SeatingRules } from '../../models/arrangement';
import {
  validateProposedSwap,
  type SeatPositionRef,
  type SwapValidationResult,
} from '../../algorithms/swapValidator';

export type ManualSwapModalProps = {
  isOpen: boolean;
  onClose: () => void;
  assignments: AssignedSeat[];
  students: ExamCandidate[];
  classrooms: Room[];
  rules?: SeatingRules;
  initialSourceSeat?: SeatPositionRef;
  initialTargetSeat?: SeatPositionRef;
  isVersionFinalized?: boolean;
  nextVersionNumber?: number;
  onConfirmSwap: (result: {
    fromSeat: SeatPositionRef;
    toSeat: SeatPositionRef;
    simulatedAssignments: AssignedSeat[];
    validationReport: ValidationReport;
  }) => void;
};

export const ManualSwapModal: React.FC<ManualSwapModalProps> = ({
  isOpen,
  onClose,
  assignments,
  students,
  classrooms,
  rules,
  initialSourceSeat,
  initialTargetSeat,
  isVersionFinalized = false,
  nextVersionNumber = 2,
  onConfirmSwap,
}) => {
  const [sourceSeat, setSourceSeat] = useState<SeatPositionRef | undefined>(initialSourceSeat);
  const [targetSeat, setTargetSeat] = useState<SeatPositionRef | undefined>(initialTargetSeat);

  // Sync state when props change
  React.useEffect(() => {
    if (initialSourceSeat) setSourceSeat(initialSourceSeat);
    if (initialTargetSeat) setTargetSeat(initialTargetSeat);
  }, [initialSourceSeat, initialTargetSeat]);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const roomMap = useMemo(() => new Map(classrooms.map((r) => [r.id, r])), [classrooms]);

  // Helper to find occupant
  const getSeatOccupant = (seat?: SeatPositionRef) => {
    if (!seat) return undefined;
    const assignment = assignments.find(
      (a) =>
        (a.roomId === seat.roomId || a.classroomId === seat.roomId) &&
        a.row === seat.row &&
        a.column === seat.column &&
        (a.position ?? a.seatIndex) === seat.seatIndex
    );
    if (!assignment) return undefined;
    const id = assignment.studentId || assignment.candidateId;
    return id ? studentMap.get(id) : undefined;
  };

  const sourceCandidate = getSeatOccupant(sourceSeat);
  const targetCandidate = getSeatOccupant(targetSeat);
  const sourceRoom = sourceSeat ? roomMap.get(sourceSeat.roomId) : undefined;
  const targetRoom = targetSeat ? roomMap.get(targetSeat.roomId) : undefined;

  // Run validation on the proposed swap
  const swapResult: SwapValidationResult | null = useMemo(() => {
    if (!sourceSeat || !targetSeat) return null;
    return validateProposedSwap(assignments, students, classrooms, sourceSeat, targetSeat, rules);
  }, [assignments, students, classrooms, sourceSeat, targetSeat, rules]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!sourceSeat || !targetSeat || !swapResult || !swapResult.isValid) return;
    onConfirmSwap({
      fromSeat: sourceSeat,
      toSeat: targetSeat,
      simulatedAssignments: swapResult.simulatedAssignments,
      validationReport: swapResult.validationReport,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Validator-Guarded Manual Move / Swap (PRD Section 4.5 & 4.6)
              </h3>
              <p className="text-xs text-slate-500">
                All hard constraints (C1 Capacity, C2 Subject, C3 Branch/Sem, C5 Physical) are pre-validated before applying.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Finalized version warning banner */}
        {isVersionFinalized && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-amber-800">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              This allocation is finalized and locked. Confirming this change will automatically branch into Version {nextVersionNumber} (Draft) and mark the prior version as superseded.
            </span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Seats Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Seat A Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Seat Position A
                </span>
                {sourceRoom && sourceSeat && (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    <MapPin className="w-3 h-3" />
                    {sourceRoom.name} (R{sourceSeat.row + 1}, C{sourceSeat.column + 1}, Pos {sourceSeat.seatIndex + 1})
                  </span>
                )}
              </div>

              {sourceCandidate ? (
                <div className="rounded-lg border border-indigo-100 bg-white p-3 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <p className="font-mono text-base font-bold text-slate-900">
                      {sourceCandidate.registerNumber}
                    </p>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
                      {sourceCandidate.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px] pt-1">
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 border border-indigo-200">
                      {sourceCandidate.branch} ({sourceCandidate.semester})
                    </span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 border border-emerald-200">
                      {sourceCandidate.subjectCode}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white/50 p-4 text-center text-xs text-slate-400 italic">
                  Empty Seat
                </div>
              )}
            </div>

            {/* Seat B Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Seat Position B
                </span>
                {targetRoom && targetSeat && (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    <MapPin className="w-3 h-3" />
                    {targetRoom.name} (R{targetSeat.row + 1}, C{targetSeat.column + 1}, Pos {targetSeat.seatIndex + 1})
                  </span>
                )}
              </div>

              {targetCandidate ? (
                <div className="rounded-lg border border-indigo-100 bg-white p-3 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <p className="font-mono text-base font-bold text-slate-900">
                      {targetCandidate.registerNumber}
                    </p>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
                      {targetCandidate.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px] pt-1">
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 border border-indigo-200">
                      {targetCandidate.branch} ({targetCandidate.semester})
                    </span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 border border-emerald-200">
                      {targetCandidate.subjectCode}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white/50 p-4 text-center text-xs text-slate-400 italic">
                  Empty Seat (Move candidate here)
                </div>
              )}
            </div>
          </div>

          {/* Real-time Validation Report */}
          {swapResult ? (
            <div
              className={`rounded-xl border p-4 transition-all ${
                swapResult.isValid
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                  : 'border-red-200 bg-red-50/70 text-red-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {swapResult.isValid ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold text-sm">
                    {swapResult.isValid
                      ? 'Proposed Swap is Valid — All Hard Constraints Satisfied'
                      : 'Proposed Swap Rejected by Constraint Validator'}
                  </p>
                  {swapResult.isValid ? (
                    <div className="text-xs text-emerald-800 space-y-0.5">
                      <p>
                        No bench conflicts (C2 Subject, C3 Branch/Semester) or physical violations detected.
                      </p>
                      <p className="font-medium">
                        Quality Score: {swapResult.qualityImpact.beforeScore}% → {swapResult.qualityImpact.afterScore}%
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-red-800 space-y-1 mt-1">
                      <p className="font-semibold">Blocking Violations:</p>
                      <ul className="list-disc list-inside space-y-1 pl-1">
                        {swapResult.blockingReasons.map((reason, idx) => (
                          <li key={idx} className="font-medium">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Select both Seat A and Seat B to run validation.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!swapResult || !swapResult.isValid}
            onClick={handleConfirm}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {isVersionFinalized ? `Branch to v${nextVersionNumber} & Confirm` : 'Confirm Move / Swap'}
          </Button>
        </div>
      </div>
    </div>
  );
};
