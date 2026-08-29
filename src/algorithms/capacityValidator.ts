import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';

export type CapacityStatus = 'SUFFICIENT' | 'INSUFFICIENT';

export type CapacityValidationResult = {
  status: CapacityStatus;
  totalValidStudents: number;
  totalAvailableSeats: number;
  capacityDifference: number;
  shortageCount: number;
};

export function validateSeatingCapacity(
  classrooms: Classroom[],
  students: Student[]
): CapacityValidationResult {
  const totalAvailableSeats = classrooms.reduce(
    (sum, classroom) => sum + Math.max(0, classroom.usableCapacity ?? 0),
    0
  );

  const totalValidStudents = students.length;
  const capacityDifference = totalAvailableSeats - totalValidStudents;
  const shortageCount = Math.max(0, totalValidStudents - totalAvailableSeats);

  return {
    status: shortageCount > 0 ? 'INSUFFICIENT' : 'SUFFICIENT',
    totalValidStudents,
    totalAvailableSeats,
    capacityDifference,
    shortageCount,
  };
}
