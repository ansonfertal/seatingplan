import type { AssignedSeat, SeatingRules, ValidationReport } from '../models/arrangement';
import type { Classroom, Room } from '../models/classroom';
import type { ExamCandidate, Student } from '../models/student';
import {
  validateSeatingPlanIndependently,
  type ViolationDetail,
} from './independentValidator';

export type SeatPositionRef = {
  roomId: string;
  row: number;
  column: number;
  seatIndex: number;
};

export type SwapValidationResult = {
  isValid: boolean;
  simulatedAssignments: AssignedSeat[];
  violations: ViolationDetail[];
  validationReport: ValidationReport;
  blockingReasons: string[];
  qualityImpact: {
    beforeScore: number;
    afterScore: number;
  };
};

export function isSameSeatRef(a: SeatPositionRef, b: SeatPositionRef): boolean {
  return (
    a.roomId === b.roomId &&
    a.row === b.row &&
    a.column === b.column &&
    a.seatIndex === b.seatIndex
  );
}

/**
 * Simulates a swap between two seats or a move to an empty seat.
 * Preserves all metadata, ensuring candidate IDs are appropriately relocated.
 */
export function simulateSeatSwap(
  assignments: AssignedSeat[],
  fromSeat: SeatPositionRef,
  toSeat: SeatPositionRef
): AssignedSeat[] {
  if (isSameSeatRef(fromSeat, toSeat)) {
    return [...assignments];
  }

  const fromIdx = assignments.findIndex(
    (a) =>
      (a.roomId === fromSeat.roomId || a.classroomId === fromSeat.roomId) &&
      a.row === fromSeat.row &&
      a.column === fromSeat.column &&
      (a.position ?? a.seatIndex) === fromSeat.seatIndex
  );

  const toIdx = assignments.findIndex(
    (a) =>
      (a.roomId === toSeat.roomId || a.classroomId === toSeat.roomId) &&
      a.row === toSeat.row &&
      a.column === toSeat.column &&
      (a.position ?? a.seatIndex) === toSeat.seatIndex
  );

  // If neither seat has an occupant, nothing changes
  if (fromIdx === -1 && toIdx === -1) {
    return [...assignments];
  }

  const nextAssignments = assignments.map((a) => ({ ...a }));

  // Case 1: Both seats occupied -> Swap candidates between the two seats
  if (fromIdx !== -1 && toIdx !== -1) {
    const fromStudentId = nextAssignments[fromIdx].studentId || nextAssignments[fromIdx].candidateId || '';
    const fromCandidateId = nextAssignments[fromIdx].candidateId || nextAssignments[fromIdx].studentId;
    const toStudentId = nextAssignments[toIdx].studentId || nextAssignments[toIdx].candidateId || '';
    const toCandidateId = nextAssignments[toIdx].candidateId || nextAssignments[toIdx].studentId;

    nextAssignments[fromIdx] = {
      ...nextAssignments[fromIdx],
      studentId: toStudentId,
      candidateId: toCandidateId,
    };

    nextAssignments[toIdx] = {
      ...nextAssignments[toIdx],
      studentId: fromStudentId,
      candidateId: fromCandidateId,
    };

    return nextAssignments;
  }

  // Case 2: fromSeat occupied, toSeat empty -> Move candidate to toSeat
  if (fromIdx !== -1 && toIdx === -1) {
    nextAssignments[fromIdx] = {
      ...nextAssignments[fromIdx],
      roomId: toSeat.roomId,
      classroomId: toSeat.roomId,
      row: toSeat.row,
      column: toSeat.column,
      seatIndex: toSeat.seatIndex,
      position: toSeat.seatIndex,
    };
    return nextAssignments;
  }

  // Case 3: fromSeat empty, toSeat occupied -> Move candidate to fromSeat
  if (fromIdx === -1 && toIdx !== -1) {
    nextAssignments[toIdx] = {
      ...nextAssignments[toIdx],
      roomId: fromSeat.roomId,
      classroomId: fromSeat.roomId,
      row: fromSeat.row,
      column: fromSeat.column,
      seatIndex: fromSeat.seatIndex,
      position: fromSeat.seatIndex,
    };
    return nextAssignments;
  }

  return nextAssignments;
}

/**
 * Validates a proposed manual seat move or swap against all hard constraints C1–C5
 * using the decoupled independent validator.
 */
export function validateProposedSwap(
  currentAssignments: AssignedSeat[],
  students: (Student | ExamCandidate)[],
  classrooms: (Room | Classroom)[],
  fromSeat: SeatPositionRef,
  toSeat: SeatPositionRef,
  rules?: SeatingRules
): SwapValidationResult {
  const simulatedAssignments = simulateSeatSwap(currentAssignments, fromSeat, toSeat);
  const validationResult = validateSeatingPlanIndependently(simulatedAssignments, students, classrooms, rules);
  const beforeReport = validateSeatingPlanIndependently(currentAssignments, students, classrooms, rules);

  const blockingReasons = validationResult.violations.map((v) => v.message);

  return {
    isValid: validationResult.isValid,
    simulatedAssignments,
    violations: validationResult.violations,
    validationReport: validationResult.asValidationReport(),
    blockingReasons,
    qualityImpact: {
      beforeScore: beforeReport.summary.qualityScore,
      afterScore: validationResult.summary.qualityScore,
    },
  };
}
