import type { SeatPosition } from '../models/classroom';

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
  return (rows * columns * studentsPerBench) - disabledSeats.length;
}
