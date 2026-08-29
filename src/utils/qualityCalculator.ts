import type { ArrangementStatistics } from '../models/arrangement';

export type ArrangementQualityInput = {
  totalStudents: number;
  assignedStudents: number;
  unassignedStudents: number;
  totalAvailableSeats: number;
  unusedSeats: number;
  totalConflicts: number;
};

export function calculateArrangementQuality(
  input: ArrangementQualityInput
): ArrangementStatistics {
  const maxPossibleConflicts = Math.max(1, input.totalAvailableSeats || input.totalStudents || 1);
  const qualityScore = Math.max(
    0,
    Math.min(100, Math.round(100 * (1 - input.totalConflicts / maxPossibleConflicts)))
  );

  return {
    totalStudents: input.totalStudents,
    assignedStudents: input.assignedStudents,
    unassignedStudents: input.unassignedStudents,
    totalAvailableSeats: input.totalAvailableSeats,
    unusedSeats: input.unusedSeats,
    totalConflicts: input.totalConflicts,
    qualityScore,
  };
}
