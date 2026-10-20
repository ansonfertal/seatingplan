import type { Exam, ExamDetails } from './exam';
import type { Classroom, Room } from './classroom';

export type RegisterNumberOrder = 'sorted' | 'random';

export type SeatingRules = {
  sameBenchSeparation: boolean;
  horizontalAdjacency: boolean;
  verticalAdjacency: boolean;
  diagonalAdjacency: boolean;
  sameSemesterSeparation: boolean;
  sameSubjectCodeSeparation: boolean;
  /** Phase 7: Enforce neighboring bench adjacency as hard constraint (prohibit placement) rather than soft penalty */
  strictAdjacency?: boolean;
  /** Phase 7: Prohibit candidates from same branch on adjacent benches */
  adjacentSameBranchSeparation?: boolean;
  /** Phase 7: Prohibit candidates taking same subject code on adjacent benches */
  adjacentSameSubjectSeparation?: boolean;
  /** Controls whether candidates' register numbers are assigned in sorted alphanumeric order or randomized */
  registerNumberOrder?: RegisterNumberOrder;
  /** Primary goal: Minimize number of classrooms activated/used */
  minimizeClassroomsUsed?: boolean;
  /** Vary room selection and seating arrangement across different exam dates */
  differentArrangementPerDate?: boolean;
};

export const DEFAULT_SEATING_RULES: SeatingRules = {
  sameBenchSeparation: true,
  horizontalAdjacency: true,
  verticalAdjacency: true,
  diagonalAdjacency: false,
  sameSemesterSeparation: true,
  sameSubjectCodeSeparation: true,
  registerNumberOrder: 'sorted',
  minimizeClassroomsUsed: true,
  differentArrangementPerDate: true,
};

/**
 * Physical seat assignment model conforming to PRD Section 5.
 */
export type SeatAssignment = {
  allocationVersionId?: string;
  candidateId?: string;
  roomId?: string;
  row: number;
  column: number;
  /** Ordered bench seat position (0 to studentsPerBench - 1) */
  position?: number;

  // Backward-compatible aliases
  studentId: string;
  classroomId: string;
  seatIndex: number;
};

/** Backward-compatible alias for SeatAssignment */
export type AssignedSeat = SeatAssignment;

export type ArrangementStatistics = {
  totalStudents: number;
  assignedStudents: number;
  unassignedStudents: number;
  totalAvailableSeats: number;
  unusedSeats: number;
  totalConflicts: number;
  qualityScore: number;
};

export type ConflictDetail = {
  classroomId: string;
  seatA: { row: number; column: number; seatIndex: number };
  seatB: { row: number; column: number; seatIndex: number };
  studentAId: string;
  studentBId: string;
  branch: string;
  reason?: 'branch' | 'semester' | 'subjectCode' | 'capacity';
  value?: string;
};

export type ValidationStatus = 'Valid' | 'Review Recommended' | 'Invalid';

export type ValidationReport = {
  status: ValidationStatus;
  conflicts: ConflictDetail[];
  summary: ArrangementStatistics;
  violations?: string[];
};

export type UnassignedCandidate = {
  candidateId: string;
  registerNumber: string;
  name: string;
  branch: string;
  semester: string;
  subjectCode: string;
  reason: string;
};

export type AllocationVersionStatus = 'draft' | 'finalized' | 'superseded';

/**
 * AllocationVersion entity as specified in PRD Section 5.
 * Captures an immutable or draft version of a seating arrangement snapshot.
 */
export type AllocationVersion = {
  id: string;
  examId: string;
  versionNumber: number;
  status: AllocationVersionStatus;
  algorithmVersion: string;
  seed: number;
  generatedAt: string;
  finalizedAt?: string;
  supersededAt?: string;
  summary: ArrangementStatistics;
  validationReport?: ValidationReport;
  assignments: SeatAssignment[];
  unassignedCandidates?: UnassignedCandidate[];
};

/**
 * SeatingArrangement representation maintained for backward compatibility.
 */
export type SeatingArrangement = {
  exam: Exam | ExamDetails;
  classrooms: (Room | Classroom)[];
  assignments: AssignedSeat[];
  generatedAt: string;
  generationSeed: number;
  statistics: ArrangementStatistics;
  version?: AllocationVersion;
};

/**
 * Document print template configuration conforming to PRD Section 5.
 */
export type PrintDocumentType =
  | 'attendance_1'
  | 'attendance_2'
  | 'seating_notice'
  | 'daily_attendance'
  | 'room_seating_plan'
  | 'combined_pack';

export type PrintTemplate = {
  documentType: PrintDocumentType;
  templateVersion: string;
  pageSettings: {
    orientation: 'portrait' | 'landscape';
    size: 'A4';
    marginsMm: number;
  };
  fieldMapping: Record<string, string>;
  approvalStatus: 'draft' | 'approved';
};
