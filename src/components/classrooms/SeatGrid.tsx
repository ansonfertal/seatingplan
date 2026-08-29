import React from 'react';
import type { Classroom, SeatPosition } from '../../models/classroom';
import { cn } from '../ui/Modal';
import { calculateUsableCapacity } from '../../utils/capacityCalculator';

interface SeatGridProps {
  classroom: Classroom;
  onUpdate: (updatedClassroom: Classroom) => void;
}

export const SeatGrid: React.FC<SeatGridProps> = ({ classroom, onUpdate }) => {
  const { rows, columns, studentsPerBench, disabledSeats } = classroom;

  const isSeatDisabled = (r: number, c: number, sIdx: number) => {
    return disabledSeats.some(
      (seat) => seat.row === r && seat.column === c && seat.seatIndex === sIdx
    );
  };

  const toggleSeat = (r: number, c: number, sIdx: number) => {
    const disabled = isSeatDisabled(r, c, sIdx);
    let newDisabledSeats: SeatPosition[];

    if (disabled) {
      // Remove from disabled
      newDisabledSeats = disabledSeats.filter(
        (seat) => !(seat.row === r && seat.column === c && seat.seatIndex === sIdx)
      );
    } else {
      // Add to disabled
      newDisabledSeats = [...disabledSeats, { row: r, column: c, seatIndex: sIdx }];
    }

    onUpdate({
      ...classroom,
      disabledSeats: newDisabledSeats,
      usableCapacity: calculateUsableCapacity(rows, columns, studentsPerBench, newDisabledSeats),
    });
  };

  return (
    <div className="flex flex-col items-center overflow-x-auto p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="mb-6 w-3/4 max-w-md h-8 bg-gray-300 rounded-md flex items-center justify-center font-semibold text-gray-600 text-sm tracking-widest uppercase shadow-inner">
        Front Board
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`row-${rIdx}`} className="flex gap-4">
            <div className="flex items-center justify-center w-6 text-xs font-bold text-gray-400">
              R{rIdx + 1}
            </div>
            
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div 
                key={`col-${rIdx}-${cIdx}`}
                className="flex p-1 bg-white border-2 border-gray-200 rounded-md shadow-sm gap-1 transition-all"
              >
                {Array.from({ length: studentsPerBench }).map((_, sIdx) => {
                  const disabled = isSeatDisabled(rIdx, cIdx, sIdx);
                  return (
                    <button
                      key={`seat-${rIdx}-${cIdx}-${sIdx}`}
                      onClick={() => toggleSeat(rIdx, cIdx, sIdx)}
                      className={cn(
                        "w-8 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors border",
                        disabled 
                          ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed pattern-diagonal-lines-sm" 
                          : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300 cursor-pointer"
                      )}
                      title={disabled ? "Seat Disabled" : "Seat Available"}
                    >
                      {disabled ? '✕' : ''}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400">✕</div>
          <span className="text-gray-600">Disabled (Obstruction)</span>
        </div>
      </div>
    </div>
  );
};
