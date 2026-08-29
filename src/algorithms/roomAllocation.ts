import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';
import { createSeededRandom, shuffle } from './random';

export type RoomAllocation = {
  classroomId: string;
  studentIds: string[];
};

export type RoomAllocationResult = {
  allocations: RoomAllocation[];
  roomOccupancy: Record<string, number>;
};

export function allocateStudentsToRooms(
  students: Student[],
  classrooms: Classroom[],
  seed = 1
): RoomAllocationResult {
  const activeClassrooms = classrooms.filter((classroom) => (classroom.usableCapacity ?? 0) > 0);
  const roomEntries = activeClassrooms.map((classroom) => ({
    classroomId: classroom.id,
    capacity: classroom.usableCapacity ?? 0,
    studentIds: [] as string[],
    branchCounts: {} as Record<string, number>,
  }));

  if (students.length === 0 || roomEntries.length === 0) {
    return {
      allocations: roomEntries.map(({ classroomId, studentIds }) => ({ classroomId, studentIds })),
      roomOccupancy: Object.fromEntries(roomEntries.map(({ classroomId }) => [classroomId, 0])),
    };
  }

  const groups: Record<string, Student[]> = {};
  students.forEach((student) => {
    const branch = student.branch.trim() || 'UNSPECIFIED';
    groups[branch] = groups[branch] ? [...groups[branch], student] : [student];
  });

  const sortedBranches = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  const random = createSeededRandom(seed);

  sortedBranches.forEach(([branch, branchStudents]) => {
    const shuffledStudents = shuffle(branchStudents, Math.floor(random() * 1000000) + 1);

    shuffledStudents.forEach((student) => {
      const eligibleRooms = roomEntries.filter((room) => room.studentIds.length < room.capacity);

      if (eligibleRooms.length === 0) {
        return;
      }

      let bestRoom = eligibleRooms[0];
      let bestScore = Number.POSITIVE_INFINITY;

      eligibleRooms.forEach((room) => {
        const branchCount = room.branchCounts[branch] ?? 0;
        const remainingSeats = room.capacity - room.studentIds.length;
        const branchDensity = room.studentIds.length === 0 ? 0 : branchCount / room.studentIds.length;
        const score = remainingSeats * 0.4 - branchCount * 1.8 + branchDensity * 100;

        if (score < bestScore) {
          bestScore = score;
          bestRoom = room;
        }
      });

      bestRoom.studentIds.push(student.id);
      bestRoom.branchCounts[branch] = (bestRoom.branchCounts[branch] ?? 0) + 1;
    });
  });

  const allocations = roomEntries.map(({ classroomId, studentIds }) => ({
    classroomId,
    studentIds,
  }));

  return {
    allocations,
    roomOccupancy: Object.fromEntries(
      roomEntries.map(({ classroomId, studentIds }) => [classroomId, studentIds.length])
    ),
  };
}
