import type { AssignedSeat } from '../models/arrangement';

export type SeatSelection = {
  classroomId: string;
  row: number;
  column: number;
  seatIndex: number;
};

function sameSeat(left: SeatSelection, right: SeatSelection): boolean {
  return (
    left.classroomId === right.classroomId &&
    left.row === right.row &&
    left.column === right.column &&
    left.seatIndex === right.seatIndex
  );
}

export function applySeatSwapToAssignments(
  assignments: AssignedSeat[],
  fromSeat: SeatSelection,
  toSeat: SeatSelection
): AssignedSeat[] {
  const nextAssignments = assignments.map((assignment) => ({ ...assignment }));

  const fromAssignmentIndex = nextAssignments.findIndex(
    (assignment) =>
      assignment.classroomId === fromSeat.classroomId &&
      assignment.row === fromSeat.row &&
      assignment.column === fromSeat.column &&
      assignment.seatIndex === fromSeat.seatIndex
  );

  const toAssignmentIndex = nextAssignments.findIndex(
    (assignment) =>
      assignment.classroomId === toSeat.classroomId &&
      assignment.row === toSeat.row &&
      assignment.column === toSeat.column &&
      assignment.seatIndex === toSeat.seatIndex
  );

  if (fromAssignmentIndex === -1 && toAssignmentIndex === -1) {
    return assignments;
  }

  if (fromAssignmentIndex === -1 && toAssignmentIndex !== -1) {
    const source = nextAssignments[toAssignmentIndex];
    return nextAssignments
      .filter((assignment) => !sameSeat(
        {
          classroomId: assignment.classroomId,
          row: assignment.row,
          column: assignment.column,
          seatIndex: assignment.seatIndex,
        },
        toSeat
      ))
      .concat({
        ...source,
        classroomId: fromSeat.classroomId,
        row: fromSeat.row,
        column: fromSeat.column,
        seatIndex: fromSeat.seatIndex,
      });
  }

  if (fromAssignmentIndex !== -1 && toAssignmentIndex === -1) {
    const source = nextAssignments[fromAssignmentIndex];
    return nextAssignments
      .filter((assignment) => !sameSeat(
        {
          classroomId: assignment.classroomId,
          row: assignment.row,
          column: assignment.column,
          seatIndex: assignment.seatIndex,
        },
        fromSeat
      ))
      .concat({
        ...source,
        classroomId: toSeat.classroomId,
        row: toSeat.row,
        column: toSeat.column,
        seatIndex: toSeat.seatIndex,
      });
  }

  const fromStudentId = nextAssignments[fromAssignmentIndex].studentId;
  const toStudentId = nextAssignments[toAssignmentIndex].studentId;

  nextAssignments[fromAssignmentIndex] = {
    ...nextAssignments[fromAssignmentIndex],
    studentId: toStudentId,
    classroomId: toSeat.classroomId,
    row: toSeat.row,
    column: toSeat.column,
    seatIndex: toSeat.seatIndex,
  };

  nextAssignments[toAssignmentIndex] = {
    ...nextAssignments[toAssignmentIndex],
    studentId: fromStudentId,
    classroomId: fromSeat.classroomId,
    row: fromSeat.row,
    column: fromSeat.column,
    seatIndex: fromSeat.seatIndex,
  };

  return nextAssignments;
}
