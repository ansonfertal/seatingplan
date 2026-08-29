import React from 'react';
import type { AssignedSeat } from '../../models/arrangement';
import type { Classroom } from '../../models/classroom';
import type { Student } from '../../models/student';

export type ClassroomGridProps = {
  classroom: Classroom;
  assignments: AssignedSeat[];
  students: Student[];
  selectedStudentId?: string;
  selectedSeat?: { classroomId: string; row: number; column: number; seatIndex: number };
  onSelectSeat: (seat: { classroomId: string; row: number; column: number; seatIndex: number }) => void;
};

export const ClassroomGrid: React.FC<ClassroomGridProps> = ({
  classroom,
  assignments,
  students,
  selectedStudentId,
  selectedSeat,
  onSelectSeat,
}) => {
  const studentMap = React.useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students]
  );

  const seatCells = [] as React.ReactNode[];

  for (let row = 0; row < classroom.rows; row += 1) {
    for (let column = 0; column < classroom.columns; column += 1) {
      const seatCount = classroom.studentsPerBench;

      for (let seatIndex = 0; seatIndex < seatCount; seatIndex += 1) {
        const assignment = assignments.find(
          (item) =>
            item.classroomId === classroom.id &&
            item.row === row &&
            item.column === column &&
            item.seatIndex === seatIndex
        );

        const student = assignment ? studentMap.get(assignment.studentId) : undefined;
        const isDisabled = classroom.disabledSeats.some(
          (seat) =>
            seat.row === row &&
            seat.column === column &&
            seat.seatIndex === seatIndex
        );

        const seatKey = `${row}-${column}-${seatIndex}`;
        const isSelected =
          selectedSeat?.classroomId === classroom.id &&
          selectedSeat.row === row &&
          selectedSeat.column === column &&
          selectedSeat.seatIndex === seatIndex;

        const isHighlighted = selectedStudentId && student?.id === selectedStudentId;

        seatCells.push(
          <button
            key={`${classroom.id}-${seatKey}`}
            type="button"
            onClick={() => onSelectSeat({ classroomId: classroom.id, row, column, seatIndex })}
            className={[
              'relative flex h-16 min-w-[72px] flex-col items-center justify-center rounded-md border p-1 text-center text-[10px] font-medium transition-all',
              isDisabled
                ? 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500'
                : student
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-900 hover:border-indigo-400 hover:bg-indigo-100'
                  : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50',
              isSelected ? 'ring-2 ring-indigo-600 ring-offset-1' : '',
              isHighlighted ? 'border-green-500 bg-green-50 text-green-900' : '',
            ].join(' ')}
            disabled={isDisabled}
          >
            {!isDisabled ? (
              <>
                <span className="truncate max-w-full font-semibold">{student ? student.registerNumber : 'Empty'}</span>
                {student ? (
                  <span className="mt-0.5 max-w-full truncate text-[9px] text-indigo-700">{student.branch}</span>
                ) : (
                  <span className="mt-0.5 text-[9px]">Open</span>
                )}
              </>
            ) : (
              <span className="text-[9px] uppercase tracking-wide">Disabled</span>
            )}
          </button>
        );
      }
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${classroom.columns}, minmax(72px, 1fr))` }}>
        {seatCells}
      </div>
    </div>
  );
};
