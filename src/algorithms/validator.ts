import type { AssignedSeat, ConflictDetail, SeatingRules, ValidationReport } from '../models/arrangement';
import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';
import { calculateArrangementQuality } from '../utils/qualityCalculator';
import { buildSeatGraph, getSeatKey } from './seatGraph';

const getAssignmentKey = (classroomId: string, seat: { row: number; column: number; seatIndex: number }) =>
  `${classroomId}:${getSeatKey(seat)}`;

export function validateArrangementConflicts(
  assignments: AssignedSeat[],
  students: Student[],
  classrooms: Classroom[],
  rules: SeatingRules
): ConflictDetail[] {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const seatAssignments = new Map<string, AssignedSeat>();
  const violationKeys = new Set<string>();

  assignments.forEach((assignment) => {
    const key = getAssignmentKey(assignment.classroomId, assignment);
    seatAssignments.set(key, assignment);
  });

  const conflicts: ConflictDetail[] = [];

  classrooms.forEach((classroom) => {
    const graph = buildSeatGraph(classroom, rules);
    const classAssignments = assignments.filter((assignment) => assignment.classroomId === classroom.id);

    classAssignments.forEach((assignment) => {
      const neighbors = graph.adjacency[getSeatKey({
        row: assignment.row,
        column: assignment.column,
        seatIndex: assignment.seatIndex,
      })] ?? [];

      neighbors.forEach((neighborKey) => {
        const neighborAssignment = seatAssignments.get(`${classroom.id}:${neighborKey}`);
        if (!neighborAssignment || neighborAssignment.studentId === assignment.studentId) {
          return;
        }

        const studentA = studentMap.get(assignment.studentId);
        const studentB = studentMap.get(neighborAssignment.studentId);
        if (!studentA || !studentB) {
          return;
        }

        const matchingReasons: Array<{ reason: ConflictDetail['reason']; value?: string; branch: string }> = [];
        if (studentA.branch && studentA.branch === studentB.branch) {
          matchingReasons.push({ reason: 'branch', branch: studentA.branch });
        }
        if (rules.sameSemesterSeparation && studentA.semester && studentA.semester === studentB.semester) {
          matchingReasons.push({ reason: 'semester', value: studentA.semester, branch: studentA.branch });
        }
        if (rules.sameSubjectCodeSeparation && studentA.subjectCode && studentA.subjectCode === studentB.subjectCode) {
          matchingReasons.push({ reason: 'subjectCode', value: studentA.subjectCode, branch: studentA.branch });
        }

        matchingReasons.forEach(({ reason, value, branch }) => {
          const pairKey = [assignment.studentId, neighborAssignment.studentId].sort().join('|');
          const conflictKey = `${pairKey}:${reason}`;
          if (violationKeys.has(conflictKey)) return;
          violationKeys.add(conflictKey);

          conflicts.push({
            classroomId: classroom.id,
            seatA: { row: assignment.row, column: assignment.column, seatIndex: assignment.seatIndex },
            seatB: {
              row: neighborAssignment.row,
              column: neighborAssignment.column,
              seatIndex: neighborAssignment.seatIndex,
            },
            studentAId: assignment.studentId,
            studentBId: neighborAssignment.studentId,
            branch,
            reason,
            value,
          });
        });
      });
    });
  });

  return conflicts;
}

export function buildValidationReport(
  assignments: AssignedSeat[],
  students: Student[],
  classrooms: Classroom[],
  rules: SeatingRules
): ValidationReport {
  const conflicts = validateArrangementConflicts(assignments, students, classrooms, rules);
  const totalAvailableSeats = classrooms.reduce(
    (sum, classroom) => sum + Math.max(0, classroom.usableCapacity ?? 0),
    0
  );
  const assignedStudents = new Set(assignments.map((assignment) => assignment.studentId)).size;
  const totalStudents = students.length;
  const unassignedStudents = Math.max(0, totalStudents - assignedStudents);
  const unusedSeats = Math.max(0, totalAvailableSeats - assignedStudents);

  const summary = calculateArrangementQuality({
    totalStudents,
    assignedStudents,
    unassignedStudents,
    totalAvailableSeats,
    unusedSeats,
    totalConflicts: conflicts.length,
  });

  const status: ValidationReport['status'] =
    conflicts.length === 0 && unassignedStudents === 0 && assignedStudents <= totalAvailableSeats
      ? 'Valid'
      : conflicts.length > 0
        ? 'Review Recommended'
        : 'Invalid';

  return {
    status,
    conflicts,
    summary,
  };
}
