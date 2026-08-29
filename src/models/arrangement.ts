import type { ExamDetails } from './exam';
import type { Classroom } from './classroom';

export type SeatingRules = {
  sameBenchSeparation: boolean;
  horizontalAdjacency: boolean;
  verticalAdjacency: boolean;
  diagonalAdjacency: boolean;
};

export type AssignedSeat = {
  classroomId: string;
  row: number;
  column: number;
  seatIndex: number;
  studentId: string;
};

export type ArrangementStatistics = {
  totalStudents: number;
  assignedStudents: number;
  unassignedStudents: number;
  totalAvailableSeats: number;
  unusedSeats: number;
  totalConflicts: number;
  qualityScore: number;
};

export type SeatingArrangement = {
  exam: ExamDetails;
  classrooms: Classroom[];
  assignments: AssignedSeat[];
  generatedAt: string;
  generationSeed: number;
  statistics: ArrangementStatistics;
};

export type ConflictDetail = {
  classroomId: string;
  seatA: { row: number; column: number; seatIndex: number };
  seatB: { row: number; column: number; seatIndex: number };
  studentAId: string;
  studentBId: string;
  branch: string;
};

export type ValidationStatus = 'Valid' | 'Review Recommended' | 'Invalid';

export type ValidationReport = {
  status: ValidationStatus;
  conflicts: ConflictDetail[];
  summary: ArrangementStatistics;
};
