import type { Room, Classroom } from '../models/classroom';
import { calculateUsableCapacityForClassroom } from '../utils/capacityCalculator';
import type { ExamCandidate, Student } from '../models/student';
import { normalizeCode } from '../models/student';
import type { Exam, ExamDetails } from '../models/exam';
import { selectExamStudents } from '../utils/examStudentSelector';

export type SubjectConflictResult = {
  hasConflict: boolean;
  reason: string;
  conflictingSubjects: string[];
  candidateCount: number;
  distinctSubjectCount: number;
  roomsNeedingAdjustment: Room[];
};

/**
 * Detects whether candidates in the current exam/roster cause a conflict for Constraint C2
 * ("No two students appearing for the same subject code on the same bench") when rooms are
 * configured with 2 students per bench.
 *
 * Conflict occurs when:
 * 1. Single Subject Roster: All candidates share the exact same subject code.
 *    Any bench with 2 seats would force two same-subject candidates together.
 * 2. Dominant Subject: A single subject has more candidates than the total physical benches available,
 *    meaning by Pigeonhole Principle at least one bench must seat two same-subject candidates.
 */
export function checkSameSubjectBenchConflict(
  students: (Student | ExamCandidate)[],
  classrooms: (Classroom | Room)[],
  exam?: Exam | ExamDetails
): SubjectConflictResult {
  if (!students || students.length === 0) {
    return {
      hasConflict: false,
      reason: '',
      conflictingSubjects: [],
      candidateCount: 0,
      distinctSubjectCount: 0,
      roomsNeedingAdjustment: [],
    };
  }

  // Filter candidates relevant to the active exam
  const effectiveStudents = exam ? selectExamStudents(students, exam) : students;
  if (effectiveStudents.length === 0) {
    return {
      hasConflict: false,
      reason: '',
      conflictingSubjects: [],
      candidateCount: 0,
      distinctSubjectCount: 0,
      roomsNeedingAdjustment: [],
    };
  }

  // Tally subject codes across candidates
  const subjectMap = new Map<string, number>();
  effectiveStudents.forEach((s) => {
    const code = normalizeCode(s.subjectCode) || 'UNSPECIFIED';
    subjectMap.set(code, (subjectMap.get(code) || 0) + 1);
  });

  const distinctSubjectCount = subjectMap.size;
  const activeRooms = classrooms.filter((r) => r.active !== false);
  const roomsWithTwoPerBench = activeRooms.filter((r) => r.studentsPerBench === 2);

  // Condition 1: All candidates share the exact same subject code
  if (distinctSubjectCount === 1) {
    const [subject] = Array.from(subjectMap.keys());
    const hasRoomsWithTwo = roomsWithTwoPerBench.length > 0;
    return {
      hasConflict: hasRoomsWithTwo,
      reason: `All ${effectiveStudents.length} candidates share the same subject code (${subject}). Constraint C2 prohibits same-subject candidates on the same bench.`,
      conflictingSubjects: [subject],
      candidateCount: effectiveStudents.length,
      distinctSubjectCount: 1,
      roomsNeedingAdjustment: roomsWithTwoPerBench,
    };
  }

  // Condition 2: Subject Dominance / Pigeonhole Imbalance
  // Calculate total benches available across active rooms
  const totalBenches = activeRooms.reduce((sum, r) => {
    const cols = r.columns;
    const rows = r.rows;
    const benchCount = r.columnRows ? r.columnRows.reduce((a, b) => a + b, 0) : rows * cols;
    return sum + benchCount;
  }, 0);

  const dominatingSubjects: string[] = [];
  for (const [subject, count] of subjectMap.entries()) {
    // In a 2-student bench setup, max candidates from any single subject is 1 per bench
    if (count > totalBenches && roomsWithTwoPerBench.length > 0) {
      dominatingSubjects.push(subject);
    }
  }

  if (dominatingSubjects.length > 0) {
    return {
      hasConflict: true,
      reason: `Subject(s) ${dominatingSubjects.join(', ')} exceed total physical bench count (${totalBenches}). Constraint C2 prohibits same-subject candidates on the same bench.`,
      conflictingSubjects: dominatingSubjects,
      candidateCount: effectiveStudents.length,
      distinctSubjectCount,
      roomsNeedingAdjustment: roomsWithTwoPerBench,
    };
  }

  return {
    hasConflict: false,
    reason: '',
    conflictingSubjects: [],
    candidateCount: effectiveStudents.length,
    distinctSubjectCount,
    roomsNeedingAdjustment: [],
  };
}

/**
 * Automatically adapts rooms with 2 students per bench to 1 student per bench
 * and recalculates their usable capacity.
 */
export function autoAdjustRoomsForSubjectConflict(
  classrooms: Room[],
  conflictResult: SubjectConflictResult
): { adjustedRooms: Room[]; adjustedCount: number; changedRoomNames: string[] } {
  if (!conflictResult.hasConflict || conflictResult.roomsNeedingAdjustment.length === 0) {
    return { adjustedRooms: classrooms, adjustedCount: 0, changedRoomNames: [] };
  }

  const adjustmentSet = new Set(conflictResult.roomsNeedingAdjustment.map((r) => r.id));
  const changedRoomNames: string[] = [];

  const adjustedRooms = classrooms.map((room) => {
    if (adjustmentSet.has(room.id) && room.studentsPerBench === 2) {
      changedRoomNames.push(room.name);
      const newStudentsPerBench = 1;
      const newUsableCapacity = calculateUsableCapacityForClassroom(
        room.rows,
        room.columns,
        newStudentsPerBench,
        room.disabledSeats || [],
        room.columnRows
      );
      const newMaxCapacity =
        room.maxCapacity != null ? Math.min(room.maxCapacity, newUsableCapacity) : undefined;

      return {
        ...room,
        studentsPerBench: newStudentsPerBench,
        usableCapacity: newUsableCapacity,
        maxCapacity: newMaxCapacity,
      };
    }
    return room;
  });

  return {
    adjustedRooms,
    adjustedCount: changedRoomNames.length,
    changedRoomNames,
  };
}
