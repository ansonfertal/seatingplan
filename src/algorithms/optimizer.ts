import type { AssignedSeat, SeatingRules } from '../models/arrangement';
import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';
import { validateArrangementConflicts } from './validator';

const getSeatSignature = (assignment: Pick<AssignedSeat, 'classroomId' | 'row' | 'column' | 'seatIndex'>) =>
  `${assignment.classroomId}:${assignment.row}:${assignment.column}:${assignment.seatIndex}`;

export function optimizeSeatingAssignments(
  assignments: AssignedSeat[],
  students: Student[],
  classrooms: Classroom[],
  rules: SeatingRules,
  maxIterations = 150
): AssignedSeat[] {
  let workingAssignments = [...assignments];
  let currentConflicts = validateArrangementConflicts(workingAssignments, students, classrooms, rules);

  if (currentConflicts.length === 0) {
    return workingAssignments;
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let bestImprovement = 0;
    let bestSwap: { from: AssignedSeat; to: AssignedSeat } | null = null;

    const conflictSeatIds = new Set<string>();
    currentConflicts.forEach((conflict) => {
      const seatA = getSeatSignature({
        classroomId: conflict.classroomId,
        row: conflict.seatA.row,
        column: conflict.seatA.column,
        seatIndex: conflict.seatA.seatIndex,
      });
      const seatB = getSeatSignature({
        classroomId: conflict.classroomId,
        row: conflict.seatB.row,
        column: conflict.seatB.column,
        seatIndex: conflict.seatB.seatIndex,
      });

      conflictSeatIds.add(seatA);
      conflictSeatIds.add(seatB);
    });

    const conflictAssignments = workingAssignments.filter((assignment) =>
      conflictSeatIds.has(getSeatSignature(assignment))
    );

    for (let index = 0; index < conflictAssignments.length; index += 1) {
      const candidateA = conflictAssignments[index];
      const sameClassroomAssignments = workingAssignments.filter(
        (assignment) => assignment.classroomId === candidateA.classroomId
      );

      for (let innerIndex = 0; innerIndex < sameClassroomAssignments.length; innerIndex += 1) {
        const candidateB = sameClassroomAssignments[innerIndex];
        if (candidateA.studentId === candidateB.studentId) {
          continue;
        }

        const swappedAssignments = workingAssignments.map((assignment) => {
          if (
            assignment.classroomId === candidateA.classroomId &&
            assignment.row === candidateA.row &&
            assignment.column === candidateA.column &&
            assignment.seatIndex === candidateA.seatIndex
          ) {
            return { ...assignment, studentId: candidateB.studentId };
          }

          if (
            assignment.classroomId === candidateB.classroomId &&
            assignment.row === candidateB.row &&
            assignment.column === candidateB.column &&
            assignment.seatIndex === candidateB.seatIndex
          ) {
            return { ...assignment, studentId: candidateA.studentId };
          }

          return assignment;
        });

        const nextConflicts = validateArrangementConflicts(
          swappedAssignments,
          students,
          classrooms,
          rules
        );

        const delta = currentConflicts.length - nextConflicts.length;
        if (delta > bestImprovement) {
          bestImprovement = delta;
          bestSwap = { from: candidateA, to: candidateB };
        }
      }
    }

    if (!bestSwap || bestImprovement <= 0) {
      break;
    }

    workingAssignments = workingAssignments.map((assignment) => {
      if (
        assignment.classroomId === bestSwap.from.classroomId &&
        assignment.row === bestSwap.from.row &&
        assignment.column === bestSwap.from.column &&
        assignment.seatIndex === bestSwap.from.seatIndex
      ) {
        return { ...assignment, studentId: bestSwap.to.studentId };
      }

      if (
        assignment.classroomId === bestSwap.to.classroomId &&
        assignment.row === bestSwap.to.row &&
        assignment.column === bestSwap.to.column &&
        assignment.seatIndex === bestSwap.to.seatIndex
      ) {
        return { ...assignment, studentId: bestSwap.from.studentId };
      }

      return assignment;
    });

    currentConflicts = validateArrangementConflicts(workingAssignments, students, classrooms, rules);
    if (currentConflicts.length === 0) {
      break;
    }
  }

  return workingAssignments;
}
