import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import type { Student } from '../../models/student';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import type { SeatSelection } from '../../store/historyManager';

export type SwapModalProps = {
  isOpen: boolean;
  sourceSeat?: SeatSelection;
  targetSeat?: SeatSelection;
  sourceStudent?: Student;
  targetStudent?: Student;
  onClose: () => void;
  onConfirm: () => void;
};

const formatSeat = (seat: SeatSelection) =>
  `Row ${seat.row + 1}, Col ${seat.column + 1}, Bench ${seat.seatIndex + 1}`;

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  sourceSeat,
  targetSeat,
  sourceStudent,
  targetStudent,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !sourceSeat || !targetSeat) {
    return null;
  }

  const sourceLabel = sourceStudent ? `${sourceStudent.name} (${sourceStudent.registerNumber})` : 'Selected seat';
  const targetLabel = targetStudent ? `${targetStudent.name} (${targetStudent.registerNumber})` : 'Target seat';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm seat swap"
      maxWidth="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm swap</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
          <ArrowRightLeft className="h-5 w-5" />
          <span>
            This will swap the selected students and move both assignments to the chosen seats.
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">From</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{sourceLabel}</p>
            <p className="mt-2 text-sm text-slate-600">
              {sourceSeat.classroomId} • {formatSeat(sourceSeat)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">To</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">{targetLabel}</p>
            <p className="mt-2 text-sm text-slate-600">
              {targetSeat.classroomId} • {formatSeat(targetSeat)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Manual swaps immediately update the seating arrangement and re-run validation.
        </div>
      </div>
    </Modal>
  );
};
