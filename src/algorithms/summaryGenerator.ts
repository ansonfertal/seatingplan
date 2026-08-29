import type { Classroom } from '../models/classroom';
import type { SeatingArrangement } from '../models/arrangement';
import type { Student } from '../models/student';
import { formatRegisterRange } from '../utils/rangeFormatter';

export type SeatingSummaryRow = {
  classroomId: string;
  classroomName: string;
  branch: string;
  rollRange: string;
  studentCount: number;
  totalRoomCount: number;
};

export type SeatingSummaryTable = {
  rows: SeatingSummaryRow[];
  totalRoomCount: number;
  totalStudents: number;
};

export function generateSeatingSummary(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[]
): SeatingSummaryRow[] {
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const classroomMap = new Map(classrooms.map((classroom) => [classroom.id, classroom]));
  const summaryByKey = new Map<string, SeatingSummaryRow & { registerNumbers: string[] }>();

  arrangement.assignments.forEach((assignment) => {
    const student = studentMap.get(assignment.studentId);
    const classroom = classroomMap.get(assignment.classroomId);

    if (!student || !classroom) {
      return;
    }

    const key = `${classroom.id}:${student.branch}`;
    const existing = summaryByKey.get(key);

    if (existing) {
      existing.registerNumbers.push(student.registerNumber);
      return;
    }

    summaryByKey.set(key, {
      classroomId: classroom.id,
      classroomName: classroom.name,
      branch: student.branch,
      rollRange: '',
      studentCount: 0,
      totalRoomCount: 1,
      registerNumbers: [student.registerNumber],
    });
  });

  return Array.from(summaryByKey.values())
    .map((entry) => ({
      classroomId: entry.classroomId,
      classroomName: entry.classroomName,
      branch: entry.branch,
      rollRange: formatRegisterRange(entry.registerNumbers),
      studentCount: entry.registerNumbers.length,
      totalRoomCount: 1,
    }))
    .sort((left, right) => {
      const classroomOrder = left.classroomName.localeCompare(right.classroomName);
      if (classroomOrder !== 0) {
        return classroomOrder;
      }

      return left.branch.localeCompare(right.branch);
    });
}

export function buildSeatingSummaryTable(
  arrangement: SeatingArrangement,
  students: Student[],
  classrooms: Classroom[]
): SeatingSummaryTable {
  const rows = generateSeatingSummary(arrangement, students, classrooms);

  return {
    rows,
    totalRoomCount: classrooms.length,
    totalStudents: rows.reduce((sum, row) => sum + row.studentCount, 0),
  };
}
