import type { SeatPosition } from '../models/classroom';

export function getClassroomColumnRows(rows: number, columns: number, columnRows?: number[]): number[] {
  const maxInCols = columnRows && columnRows.length > 0 ? Math.max(...columnRows) : 0;
  return Array.from({ length: columns }, (_, column) => {
    const colVal = columnRows?.[column];
    if (colVal !== undefined) {
      if (rows > maxInCols) {
        return Math.max(0, rows);
      }
      return Math.max(0, colVal);
    }
    return Math.max(0, rows);
  });
}

/**
 * Calculates the usable capacity of a classroom.
 * 
 * @param rows Number of rows in the classroom
 * @param columns Number of columns in the classroom
 * @param studentsPerBench Number of students per bench (1 or 2)
 * @param disabledSeats Array of seat positions that are disabled/obstructed
 * @returns Net usable capacity
 */
export function calculateUsableCapacity(
  rows: number,
  columns: number,
  studentsPerBench: number,
  disabledSeats: SeatPosition[]
): number {
  const totalRows = getClassroomColumnRows(rows, columns, undefined).reduce((sum, count) => sum + count, 0);
  return (totalRows * studentsPerBench) - disabledSeats.length;
}

export function calculateUsableCapacityForClassroom(
  rows: number,
  columns: number,
  studentsPerBench: number,
  disabledSeats: SeatPosition[],
  columnRows?: number[]
): number {
  const totalRows = getClassroomColumnRows(rows, columns, columnRows).reduce((sum, count) => sum + count, 0);
  return Math.max(0, (totalRows * studentsPerBench) - disabledSeats.length);
}
