import React from 'react';
import type { AssignedSeat } from '../../models/arrangement';
import type { Classroom } from '../../models/classroom';
import type { Student } from '../../models/student';
import { getClassroomColumnRows } from '../../utils/capacityCalculator';

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
  const columnRows = getClassroomColumnRows(classroom.rows, classroom.columns, classroom.columnRows);
  const displayColumns = classroom.displayColumns ?? ['rollNo', 'branch'];

  const getDisplayValue = (field: string, student: Student) => {
    if (field === 'rollNo') return student.registerNumber;
    if (field === 'name') return student.name;
    if (field === 'branch') return student.branch;
    return student.semester || 'Semester —';
  };

  for (let column = 0; column < classroom.columns; column += 1) {
    for (let row = 0; row < columnRows[column]; row += 1) {
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
                <span className="max-w-full truncate font-semibold">{student ? getDisplayValue(displayColumns[0], student) : 'Empty'}</span>
                {student ? (
                  <span className="mt-0.5 max-w-full truncate text-[9px] text-indigo-700">
                    {displayColumns.slice(1).map((field) => getDisplayValue(field, student)).join(' | ')}
                  </span>
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

  let seatCursor = 0;
  const columnGroups = Array.from({ length: classroom.columns }, (_, column) => {
    const seatCount = columnRows[column] * classroom.studentsPerBench;
    const group = seatCells.slice(seatCursor, seatCursor + seatCount);
    seatCursor += seatCount;
    return group;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid items-start gap-2" style={{ gridTemplateColumns: `repeat(${classroom.columns}, minmax(96px, 1fr))` }}>
        {columnGroups.map((group, column) => <div key={`preview-column-${column}`} className="grid gap-2">{group}</div>)}
      </div>
    </div>
  );
};
