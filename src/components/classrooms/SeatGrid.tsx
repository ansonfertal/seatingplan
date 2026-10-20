import React from 'react';
import type { Classroom, SeatPosition, BenchPosition } from '../../models/classroom';
import { calculateUsableCapacityForClassroom, getClassroomColumnRows } from '../../utils/capacityCalculator';
import { Ban, CheckCircle2, Plus, Minus } from 'lucide-react';

interface SeatGridProps {
  classroom: Classroom;
  onUpdate: (updatedClassroom: Classroom) => void;
}

export const SeatGrid: React.FC<SeatGridProps> = ({ classroom, onUpdate }) => {
  const { rows, columns, studentsPerBench, disabledSeats, maxCapacity } = classroom;
  const blockedBenches: BenchPosition[] = classroom.blockedBenches || [];
  const columnRows = getClassroomColumnRows(rows, columns, classroom.columnRows);

  const handleAddRow = () => {
    const nextRows = rows + 1;
    const nextColumnRows = Array.from({ length: columns }, (_, c) => (columnRows[c] ?? rows) + 1);
    const physicalEffective = calculateUsableCapacityForClassroom(
      nextRows,
      columns,
      studentsPerBench,
      disabledSeats,
      nextColumnRows
    );
    const usableCapacity = maxCapacity != null ? Math.min(maxCapacity, physicalEffective) : physicalEffective;
    onUpdate({
      ...classroom,
      rows: nextRows,
      columnRows: nextColumnRows,
      usableCapacity,
    });
  };

  const handleRemoveRow = () => {
    if (rows <= 1) return;
    const nextRows = rows - 1;
    const nextColumnRows = Array.from({ length: columns }, (_, c) => Math.max(1, (columnRows[c] ?? rows) - 1));
    const nextDisabledSeats = disabledSeats.filter(
      (s) => s.row < (nextColumnRows[s.column] ?? nextRows) && s.column < columns
    );
    const nextBlockedBenches = blockedBenches.filter(
      (b) => b.row < (nextColumnRows[b.column] ?? nextRows) && b.column < columns
    );
    const physicalEffective = calculateUsableCapacityForClassroom(
      nextRows,
      columns,
      studentsPerBench,
      nextDisabledSeats,
      nextColumnRows
    );
    const usableCapacity = maxCapacity != null ? Math.min(maxCapacity, physicalEffective) : physicalEffective;
    onUpdate({
      ...classroom,
      rows: nextRows,
      columnRows: nextColumnRows,
      disabledSeats: nextDisabledSeats,
      blockedBenches: nextBlockedBenches,
      usableCapacity,
    });
  };

  const handleAddColumn = () => {
    const nextColumns = columns + 1;
    const nextColumnRows = [...columnRows, rows];
    const physicalEffective = calculateUsableCapacityForClassroom(
      rows,
      nextColumns,
      studentsPerBench,
      disabledSeats,
      nextColumnRows
    );
    const usableCapacity = maxCapacity != null ? Math.min(maxCapacity, physicalEffective) : physicalEffective;
    onUpdate({
      ...classroom,
      columns: nextColumns,
      columnRows: nextColumnRows,
      usableCapacity,
    });
  };

  const handleRemoveColumn = () => {
    if (columns <= 1) return;
    const nextColumns = columns - 1;
    const nextColumnRows = columnRows.slice(0, nextColumns);
    const nextDisabledSeats = disabledSeats.filter((s) => s.column < nextColumns);
    const nextBlockedBenches = blockedBenches.filter((b) => b.column < nextColumns);
    const physicalEffective = calculateUsableCapacityForClassroom(
      rows,
      nextColumns,
      studentsPerBench,
      nextDisabledSeats,
      nextColumnRows
    );
    const usableCapacity = maxCapacity != null ? Math.min(maxCapacity, physicalEffective) : physicalEffective;
    onUpdate({
      ...classroom,
      columns: nextColumns,
      columnRows: nextColumnRows,
      disabledSeats: nextDisabledSeats,
      blockedBenches: nextBlockedBenches,
      usableCapacity,
    });
  };

  const isSeatDisabled = (r: number, c: number, sIdx: number) => {
    return disabledSeats.some(
      (seat) => seat.row === r && seat.column === c && seat.seatIndex === sIdx
    );
  };

  const isBenchBlocked = (r: number, c: number) => {
    return blockedBenches.some((b) => b.row === r && b.column === c);
  };

  const toggleSeat = (r: number, c: number, sIdx: number) => {
    // If bench is completely blocked, unblock bench first
    let nextBlockedBenches = blockedBenches;
    if (isBenchBlocked(r, c)) {
      nextBlockedBenches = blockedBenches.filter((b) => !(b.row === r && b.column === c));
    }

    const disabled = isSeatDisabled(r, c, sIdx);
    let nextDisabledSeats: SeatPosition[];

    if (disabled) {
      nextDisabledSeats = disabledSeats.filter(
        (seat) => !(seat.row === r && seat.column === c && seat.seatIndex === sIdx)
      );
    } else {
      nextDisabledSeats = [...disabledSeats, { row: r, column: c, seatIndex: sIdx }];
    }

    const physicalEffective = calculateUsableCapacityForClassroom(
      rows,
      columns,
      studentsPerBench,
      nextDisabledSeats,
      columnRows
    );
    const usableCapacity = maxCapacity != null ? Math.min(maxCapacity, physicalEffective) : physicalEffective;

    onUpdate({
      ...classroom,
      disabledSeats: nextDisabledSeats,
      blockedBenches: nextBlockedBenches,
      usableCapacity,
    });
  };

  const toggleBench = (r: number, c: number) => {
    const isBlocked = isBenchBlocked(r, c);
    let nextBlockedBenches: BenchPosition[];
    let nextDisabledSeats = disabledSeats;

    if (isBlocked) {
      // Unblock bench
      nextBlockedBenches = blockedBenches.filter((b) => !(b.row === r && b.column === c));
      // Also unblock individual seats on this bench
      nextDisabledSeats = disabledSeats.filter((s) => !(s.row === r && s.column === c));
    } else {
      // Block bench
      nextBlockedBenches = [...blockedBenches, { row: r, column: c }];
      // Mark all seats on this bench as disabled
      for (let sIdx = 0; sIdx < studentsPerBench; sIdx++) {
        if (!isSeatDisabled(r, c, sIdx)) {
          nextDisabledSeats = [...nextDisabledSeats, { row: r, column: c, seatIndex: sIdx }];
        }
      }
    }

    const physicalEffective = calculateUsableCapacityForClassroom(
      rows,
      columns,
      studentsPerBench,
      nextDisabledSeats,
      columnRows
    );
    const usableCapacity = maxCapacity != null ? Math.min(maxCapacity, physicalEffective) : physicalEffective;

    onUpdate({
      ...classroom,
      blockedBenches: nextBlockedBenches,
      disabledSeats: nextDisabledSeats,
      usableCapacity,
    });
  };

  const totalBenches = columnRows.reduce((sum, count) => sum + count, 0);
  const totalPhysicalSeats = totalBenches * studentsPerBench;
  const totalBlockedSeats = disabledSeats.length;
  const netEffective = Math.max(0, totalPhysicalSeats - totalBlockedSeats);

  return (
    <div className="flex flex-col items-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* Quick Grid Dimension Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Grid Dimensions:</span>

          {/* Rows stepper */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <span className="text-slate-500 font-medium">Rows:</span>
            <span className="font-bold text-slate-900 min-w-[24px] text-center">{rows}</span>
            <button
              type="button"
              onClick={handleRemoveRow}
              disabled={rows <= 1}
              className="w-5 h-5 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors"
              title="Remove Row"
              aria-label="Remove Row"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="w-5 h-5 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition-colors"
              title="Add Row"
              aria-label="Add Row"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Columns stepper */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <span className="text-slate-500 font-medium">Columns:</span>
            <span className="font-bold text-slate-900 min-w-[24px] text-center">{columns}</span>
            <button
              type="button"
              onClick={handleRemoveColumn}
              disabled={columns <= 1}
              className="w-5 h-5 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-colors"
              title="Remove Column"
              aria-label="Remove Column"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleAddColumn}
              className="w-5 h-5 flex items-center justify-center rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition-colors"
              title="Add Column"
              aria-label="Add Column"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="text-slate-500 text-[11px] font-medium">
          Add as many rows & columns as needed anytime
        </div>
      </div>

      {/* Front Board Indicator */}
      <div className="w-full max-w-lg h-9 bg-slate-800 text-white rounded-xl flex items-center justify-center font-bold text-xs tracking-[0.25em] uppercase shadow-md border-b-2 border-indigo-500">
        FRONT BOARD / INSTRUCTOR PODIUM
      </div>

      {/* Bench Grid */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="inline-flex gap-4 min-w-full justify-center px-4">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div key={`column-${cIdx}`} className="flex flex-col gap-3 items-center">
              <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                Col {cIdx + 1}
              </span>

              {Array.from({ length: columnRows[cIdx] }).map((_, rIdx) => {
                const benchBlocked = isBenchBlocked(rIdx, cIdx);

                return (
                  <div
                    key={`bench-${rIdx}-${cIdx}`}
                    className={`relative p-1.5 rounded-xl border-2 transition-all shadow-sm ${
                      benchBlocked
                        ? 'bg-slate-200/80 border-slate-300 opacity-60'
                        : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {/* Row & Column Tag */}
                    <div className="flex items-center justify-between mb-1 px-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        R{rIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleBench(rIdx, cIdx)}
                        title={benchBlocked ? 'Unblock entire bench' : 'Block entire bench'}
                        aria-label={`Bench Row ${rIdx + 1}, Column ${cIdx + 1}: ${benchBlocked ? 'Blocked' : 'Available'}. Click to toggle entire bench.`}
                        aria-pressed={benchBlocked}
                        className={`text-[9px] px-1 py-0.5 rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          benchBlocked
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {benchBlocked ? 'Blocked' : 'Bench'}
                      </button>
                    </div>

                    {/* Ordered Seat Positions (1 to studentsPerBench) */}
                    <div className="flex items-center gap-1.5" role="group" aria-label={`Seats for Bench Row ${rIdx + 1}, Column ${cIdx + 1}`}>
                      {Array.from({ length: studentsPerBench }).map((_, sIdx) => {
                        const disabled = isSeatDisabled(rIdx, cIdx, sIdx);
                        return (
                          <button
                            key={`seat-${rIdx}-${cIdx}-${sIdx}`}
                            type="button"
                            onClick={() => toggleSeat(rIdx, cIdx, sIdx)}
                            aria-label={`Seat ${sIdx + 1} on Bench Row ${rIdx + 1}, Column ${cIdx + 1}: ${disabled ? 'Blocked' : 'Available'}. Click to toggle.`}
                            aria-pressed={!disabled}
                            className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                              disabled
                                ? 'bg-red-50 border-red-200 text-red-500 cursor-pointer shadow-inner'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-sm hover:scale-105'
                            }`}
                            title={`Seat ${sIdx + 1} on Bench (Row ${rIdx + 1}, Col ${cIdx + 1}) — Click to toggle`}
                          >
                            <span className="text-[9px] text-slate-400 font-mono">#{sIdx + 1}</span>
                            {disabled ? (
                              <Ban className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-slate-200 w-full text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-center text-emerald-600 font-bold text-[10px]">
              ✓
            </div>
            <span>Available Seat</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded flex items-center justify-center text-red-500 font-bold text-[10px]">
              ✕
            </div>
            <span>Blocked / Unavailable Position</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 border border-slate-300 rounded"></div>
            <span>Blocked Bench</span>
          </div>
        </div>

        <div className="flex items-center gap-4 font-medium text-slate-700">
          <span>Benches: <strong>{totalBenches}</strong></span>
          <span>Physical Seats: <strong>{totalPhysicalSeats}</strong></span>
          <span>Blocked Seats: <strong className="text-red-600">{totalBlockedSeats}</strong></span>
          <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
            Effective Capacity: <strong>{netEffective}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
