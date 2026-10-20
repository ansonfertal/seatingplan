import type {
  AssignedSeat,
  ArrangementStatistics,
  ConflictDetail,
  SeatingRules,
  ValidationReport,
  ValidationStatus,
} from '../models/arrangement';
import type { Classroom, Room } from '../models/classroom';
import { calculateEffectiveCapacity } from '../models/classroom';
import type { ExamCandidate, Student } from '../models/student';
import { normalizeCode } from '../models/student';
import { calculateArrangementQuality } from '../utils/qualityCalculator';

export type HardConstraintType =
  | 'C1_CAPACITY_EXCEEDED'
  | 'C2_SAME_BENCH_SUBJECT'
  | 'C3_SAME_BENCH_BRANCH_SEMESTER'
  | 'C4_DUPLICATE_ASSIGNMENT'
  | 'C5_INVALID_PHYSICAL_SEAT'
  | 'C6_MISSING_CANDIDATE_DATA'
  | 'C7_ADJACENT_BENCH_CONFLICT';

export type ViolationDetail = {
  type: HardConstraintType;
  message: string;
  classroomId?: string;
  seatA?: { row: number; column: number; position: number };
  seatB?: { row: number; column: number; position: number };
  studentAId?: string;
  studentBId?: string;
  value?: string;
};

export type IndependentValidationResult = {
  isValid: boolean;
  status: ValidationStatus;
  violations: ViolationDetail[];
  summary: ArrangementStatistics;
  asValidationReport: () => ValidationReport;
};

/**
 * Decoupled independent post-allocation validator (PRD Section 4.4, 4.5, 10).
 * Evaluates any seating arrangement strictly from raw inputs without relying on generator state.
 */
export function validateSeatingPlanIndependently(
  assignments: AssignedSeat[],
  students: (Student | ExamCandidate)[],
  classrooms: (Classroom | Room)[],
  rules?: SeatingRules
): IndependentValidationResult {
  const violations: ViolationDetail[] = [];
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const roomMap = new Map(classrooms.map((r) => [r.id, r]));

  // --- Check C4: Unique Candidate Assignment ---
  const candidateAssignmentCounts = new Map<string, number>();
  assignments.forEach((assignment) => {
    const studentId = assignment.studentId || assignment.candidateId;
    if (studentId) {
      candidateAssignmentCounts.set(studentId, (candidateAssignmentCounts.get(studentId) || 0) + 1);
    }
  });

  candidateAssignmentCounts.forEach((count, studentId) => {
    if (count > 1) {
      const student = studentMap.get(studentId);
      violations.push({
        type: 'C4_DUPLICATE_ASSIGNMENT',
        studentAId: studentId,
        message: `Constraint C4 Violation: Candidate ${student?.registerNumber || studentId} (${student?.name || ''}) is assigned to ${count} seats simultaneously.`,
      });
    }
  });

  // Group assignments by room and bench
  const roomAssignmentsMap = new Map<string, AssignedSeat[]>();
  // Map: `${roomId}|${row}|${col}` -> AssignedSeat[]
  const benchOccupantsMap = new Map<string, AssignedSeat[]>();
  // Set: `${roomId}|${row}|${col}|${pos}` for duplicate seat booking
  const bookedSeatPositions = new Set<string>();

  assignments.forEach((assignment) => {
    const roomId = assignment.roomId || assignment.classroomId;
    const room = roomMap.get(roomId);
    const row = assignment.row;
    const col = assignment.column;
    const pos = assignment.position ?? assignment.seatIndex;

    // --- Check C5: Valid Physical Seat ---
    if (!room) {
      violations.push({
        type: 'C5_INVALID_PHYSICAL_SEAT',
        classroomId: roomId,
        message: `Constraint C5 Violation: Seat assigned in non-existent room ID "${roomId}".`,
      });
      return;
    }

    // Always record assignment for room capacity check (C1)
    const roomList = roomAssignmentsMap.get(roomId) || [];
    roomList.push(assignment);
    roomAssignmentsMap.set(roomId, roomList);

    if (row < 0 || row >= room.rows || col < 0 || col >= room.columns || pos < 0 || pos >= room.studentsPerBench) {
      violations.push({
        type: 'C5_INVALID_PHYSICAL_SEAT',
        classroomId: roomId,
        seatA: { row, column: col, position: pos },
        message: `Constraint C5 Violation: Seat position (R${row + 1}, C${col + 1}, pos ${pos + 1}) is out of physical bounds for room ${room.name}.`,
      });
      return;
    }

    // Check if seat is disabled
    const isSeatDisabled = room.disabledSeats?.some(
      (s) => s.row === row && s.column === col && s.seatIndex === pos
    );
    if (isSeatDisabled) {
      violations.push({
        type: 'C5_INVALID_PHYSICAL_SEAT',
        classroomId: roomId,
        seatA: { row, column: col, position: pos },
        message: `Constraint C5 Violation: Seat (R${row + 1}, C${col + 1}, pos ${pos + 1}) in room ${room.name} is marked as disabled/obstruction.`,
      });
    }

    // Check if bench is blocked
    const isBenchBlocked = room.blockedBenches?.some((b) => b.row === row && b.column === col);
    if (isBenchBlocked) {
      violations.push({
        type: 'C5_INVALID_PHYSICAL_SEAT',
        classroomId: roomId,
        seatA: { row, column: col, position: pos },
        message: `Constraint C5 Violation: Bench (R${row + 1}, C${col + 1}) in room ${room.name} is completely blocked.`,
      });
    }

    // Check duplicate physical seat booking
    const seatPosKey = `${roomId}|${row}|${col}|${pos}`;
    if (bookedSeatPositions.has(seatPosKey)) {
      violations.push({
        type: 'C5_INVALID_PHYSICAL_SEAT',
        classroomId: roomId,
        seatA: { row, column: col, position: pos },
        message: `Constraint C5 Violation: Multiple candidates booked into exact same seat position (R${row + 1}, C${col + 1}, pos ${pos + 1}) in room ${room.name}.`,
      });
    }
    bookedSeatPositions.add(seatPosKey);

    const benchKey = `${roomId}|${row}|${col}`;
    const benchList = benchOccupantsMap.get(benchKey) || [];
    benchList.push(assignment);
    benchOccupantsMap.set(benchKey, benchList);
  });

  // --- Check C1: Capacity limits per room ---
  classrooms.forEach((room) => {
    const assignedCount = roomAssignmentsMap.get(room.id)?.length || 0;
    const effectiveCapacity = calculateEffectiveCapacity(room);

    if (assignedCount > effectiveCapacity) {
      violations.push({
        type: 'C1_CAPACITY_EXCEEDED',
        classroomId: room.id,
        value: `${assignedCount} > ${effectiveCapacity}`,
        message: `Constraint C1 Violation: Room ${room.name} has ${assignedCount} assigned candidates exceeding effective capacity of ${effectiveCapacity}.`,
      });
    }
  });

  // --- Check C2 & C3: Bench Occupants Pairwise Separation ---
  benchOccupantsMap.forEach((benchSeats, benchKey) => {
    if (benchSeats.length <= 1) return;

    const [roomId, rowStr, colStr] = benchKey.split('|');
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);
    const room = roomMap.get(roomId);

    for (let i = 0; i < benchSeats.length; i++) {
      for (let j = i + 1; j < benchSeats.length; j++) {
        const seatA = benchSeats[i];
        const seatB = benchSeats[j];
        const studentAId = seatA.studentId || seatA.candidateId;
        const studentBId = seatB.studentId || seatB.candidateId;
        if (!studentAId || !studentBId) continue;
        const studentA = studentMap.get(studentAId);
        const studentB = studentMap.get(studentBId);

        if (!studentA || !studentB) continue;

        const subA = normalizeCode(studentA.subjectCode);
        const subB = normalizeCode(studentB.subjectCode);
        const branchA = normalizeCode(studentA.branch);
        const branchB = normalizeCode(studentB.branch);
        const semA = normalizeCode(studentA.semester);
        const semB = normalizeCode(studentB.semester);

        // Constraint C2: No two occupants of same bench share subject code
        if (subA && subB && subA === subB) {
          violations.push({
            type: 'C2_SAME_BENCH_SUBJECT',
            classroomId: roomId,
            seatA: { row, column: col, position: seatA.position ?? seatA.seatIndex },
            seatB: { row, column: col, position: seatB.position ?? seatB.seatIndex },
            studentAId,
            studentBId,
            value: studentA.subjectCode,
            message: `Constraint C2 Violation: Candidates ${studentA.registerNumber} and ${studentB.registerNumber} on bench (R${row + 1}, C${col + 1}) in room ${room?.name || roomId} share subject code "${studentA.subjectCode}".`,
          });
        }

        // Constraint C3: No two occupants of same bench share both normalized branch and semester
        if (branchA && branchB && branchA === branchB && semA && semB && semA === semB) {
          violations.push({
            type: 'C3_SAME_BENCH_BRANCH_SEMESTER',
            classroomId: roomId,
            seatA: { row, column: col, position: seatA.position ?? seatA.seatIndex },
            seatB: { row, column: col, position: seatB.position ?? seatB.seatIndex },
            studentAId,
            studentBId,
            value: `${studentA.branch} ${studentA.semester}`,
            message: `Constraint C3 Violation: Candidates ${studentA.registerNumber} and ${studentB.registerNumber} on bench (R${row + 1}, C${col + 1}) in room ${room?.name || roomId} share both branch "${studentA.branch}" and semester "${studentA.semester}".`,
          });
        }
      }
    }
  });

  // --- Check C7: Adjacent Bench Pairwise Separation (when strictAdjacency is active) ---
  if (rules?.strictAdjacency) {
    const benchEntries = Array.from(benchOccupantsMap.entries());
    const checkedPairs = new Set<string>();

    for (let b1 = 0; b1 < benchEntries.length; b1++) {
      for (let b2 = b1 + 1; b2 < benchEntries.length; b2++) {
        const [benchKeyA, seatsA] = benchEntries[b1];
        const [benchKeyB, seatsB] = benchEntries[b2];

        const [roomAId, rowAStr, colAStr] = benchKeyA.split('|');
        const [roomBId, rowBStr, colBStr] = benchKeyB.split('|');

        if (roomAId !== roomBId) continue;

        const rowA = parseInt(rowAStr, 10);
        const colA = parseInt(colAStr, 10);
        const rowB = parseInt(rowBStr, 10);
        const colB = parseInt(colBStr, 10);

        const dRow = Math.abs(rowA - rowB);
        const dCol = Math.abs(colA - colB);

        const isHorizontal = dRow === 0 && dCol === 1;
        const isVertical = dRow === 1 && dCol === 0;
        const isDiagonal = dRow === 1 && dCol === 1;

        const isAdjacent =
          (rules.horizontalAdjacency && isHorizontal) ||
          (rules.verticalAdjacency && isVertical) ||
          (rules.diagonalAdjacency && isDiagonal);

        if (!isAdjacent) continue;

        const room = roomMap.get(roomAId);

        for (const seatA of seatsA) {
          for (const seatB of seatsB) {
            const studentAId = seatA.studentId || seatA.candidateId;
            const studentBId = seatB.studentId || seatB.candidateId;
            if (!studentAId || !studentBId) continue;

            const pairKey = [studentAId, studentBId].sort().join('|');
            if (checkedPairs.has(pairKey)) continue;

            const studentA = studentMap.get(studentAId);
            const studentB = studentMap.get(studentBId);
            if (!studentA || !studentB) continue;

            const subA = normalizeCode(studentA.subjectCode);
            const subB = normalizeCode(studentB.subjectCode);
            const branchA = normalizeCode(studentA.branch);
            const branchB = normalizeCode(studentB.branch);
            const semA = normalizeCode(studentA.semester);
            const semB = normalizeCode(studentB.semester);

            const prohibitSubject = rules.adjacentSameSubjectSeparation ?? rules.sameSubjectCodeSeparation;
            const prohibitBranch = rules.adjacentSameBranchSeparation ?? true;

            const sameSubject = Boolean(subA && subB && subA === subB);
            const sameBranch = Boolean(branchA && branchB && branchA === branchB);
            const sameBranchSem = sameBranch && Boolean(semA && semB && semA === semB);

            if (
              (prohibitSubject && sameSubject) ||
              (prohibitBranch && (sameBranch || sameBranchSem))
            ) {
              checkedPairs.add(pairKey);
              const reason = sameSubject
                ? `subject code "${studentA.subjectCode}"`
                : `branch "${studentA.branch}"`;

              violations.push({
                type: 'C7_ADJACENT_BENCH_CONFLICT',
                classroomId: roomAId,
                seatA: { row: rowA, column: colA, position: seatA.position ?? seatA.seatIndex },
                seatB: { row: rowB, column: colB, position: seatB.position ?? seatB.seatIndex },
                studentAId,
                studentBId,
                value: reason,
                message: `Constraint C7 Violation: Candidates ${studentA.registerNumber} and ${studentB.registerNumber} on adjacent benches (R${rowA + 1}, C${colA + 1}) and (R${rowB + 1}, C${colB + 1}) in room ${room?.name || roomAId} share ${reason}.`,
              });
            }
          }
        }
      }
    }
  }

  const isValid = violations.length === 0;
  const status: ValidationStatus = isValid ? 'Valid' : 'Invalid';

  const totalStudents = students.length;
  const assignedStudents = new Set(assignments.map((a) => a.studentId || a.candidateId)).size;
  const unassignedStudents = Math.max(0, totalStudents - assignedStudents);
  const totalAvailableSeats = classrooms
    .filter((r) => r.active !== false)
    .reduce((sum, r) => sum + calculateEffectiveCapacity(r), 0);
  const unusedSeats = Math.max(0, totalAvailableSeats - assignedStudents);

  const summary = calculateArrangementQuality({
    totalStudents,
    assignedStudents,
    unassignedStudents,
    totalAvailableSeats,
    unusedSeats,
    totalConflicts: violations.length,
  });

  return {
    isValid,
    status,
    violations,
    summary,
    asValidationReport: (): ValidationReport => {
      const conflicts: ConflictDetail[] = violations.map((v) => ({
        classroomId: v.classroomId || '',
        seatA: { row: v.seatA?.row ?? 0, column: v.seatA?.column ?? 0, seatIndex: v.seatA?.position ?? 0 },
        seatB: { row: v.seatB?.row ?? 0, column: v.seatB?.column ?? 0, seatIndex: v.seatB?.position ?? 0 },
        studentAId: v.studentAId || '',
        studentBId: v.studentBId || '',
        branch: v.value || '',
        reason: v.type === 'C2_SAME_BENCH_SUBJECT' ? 'subjectCode' : 'branch',
        value: v.value,
      }));

      return {
        status,
        conflicts,
        summary,
        violations: violations.map((v) => v.message),
      };
    },
  };
}
