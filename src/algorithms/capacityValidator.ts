import type { Classroom, Room } from '../models/classroom';
import { calculateEffectiveCapacity } from '../models/classroom';
import type { ExamCandidate, Student } from '../models/student';

export type CapacityStatus = 'SUFFICIENT' | 'INSUFFICIENT';

export type CapacityValidationResult = {
  status: CapacityStatus;
  totalValidStudents: number;
  totalAvailableSeats: number;
  capacityDifference: number;
  shortageCount: number;
  missingFieldsCount: number;
  missingFieldsDetails: Array<{ registerNumber: string; missing: string[] }>;
  duplicateRegNumbersCount: number;
  duplicateDetails: string[];
  canAllocate: boolean;
  blockingIssues: string[];
  warnings: string[];
};

/**
 * Pre-allocation gatekeeper check enforcing PRD Section 4.4 & 4.5:
 * - Total candidate count vs selected active rooms' effective capacity (C1)
 * - Zero uncorrected missing branch, semester, or subject code (C6)
 * - Zero duplicate register numbers (C4)
 */
export function validateSeatingCapacity(
  classrooms: (Room | Classroom)[],
  students: (ExamCandidate | Student)[]
): CapacityValidationResult {
  const activeRooms = classrooms.filter((r) => r.active !== false);

  const totalAvailableSeats = activeRooms.reduce((sum, room) => {
    return sum + calculateEffectiveCapacity(room);
  }, 0);

  const totalValidStudents = students.length;
  const capacityDifference = totalAvailableSeats - totalValidStudents;
  const shortageCount = Math.max(0, totalValidStudents - totalAvailableSeats);

  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Check C1: Total capacity
  if (classrooms.length === 0) {
    blockingIssues.push('No examination rooms have been configured.');
  } else if (activeRooms.length === 0) {
    blockingIssues.push('All configured rooms are inactive.');
  } else if (shortageCount > 0) {
    blockingIssues.push(
      `Seating capacity is insufficient: ${totalValidStudents} candidates require seats, but selected rooms offer only ${totalAvailableSeats} effective seats (Deficit: ${shortageCount} seats).`
    );
  }

  if (totalValidStudents === 0) {
    blockingIssues.push('No candidates found in roster for allocation.');
  }

  // Check C6: Missing mandatory candidate data (Branch, Semester, Subject Code)
  const missingFieldsDetails: Array<{ registerNumber: string; missing: string[] }> = [];
  students.forEach((student) => {
    const missing: string[] = [];
    if (!student.branch?.trim()) missing.push('Branch');
    if (!student.semester?.trim()) missing.push('Semester');
    if (!student.subjectCode?.trim()) missing.push('Subject Code');

    if (missing.length > 0) {
      missingFieldsDetails.push({
        registerNumber: student.registerNumber || 'Unknown',
        missing,
      });
    }
  });

  if (missingFieldsDetails.length > 0) {
    blockingIssues.push(
      `Constraint C6 Violation: ${missingFieldsDetails.length} candidate(s) are missing mandatory branch, semester, or subject code.`
    );
  }

  // Check C4: Duplicate register numbers
  const seenRegNos = new Set<string>();
  const duplicateRegNos = new Set<string>();

  students.forEach((student) => {
    const key = student.registerNumber?.trim().toLowerCase();
    if (!key) return;
    if (seenRegNos.has(key)) {
      duplicateRegNos.add(student.registerNumber);
    }
    seenRegNos.add(key);
  });

  if (duplicateRegNos.size > 0) {
    blockingIssues.push(
      `Constraint C4 Violation: ${duplicateRegNos.size} duplicate register number(s) found in candidate roster.`
    );
  }

  // Warnings
  if (totalAvailableSeats > 0 && totalValidStudents > 0) {
    const unusedPct = Math.round(((totalAvailableSeats - totalValidStudents) / totalAvailableSeats) * 100);
    if (unusedPct > 35) {
      warnings.push(`Unused seat capacity is high (${unusedPct}% empty seats).`);
    }
  }

  const canAllocate = blockingIssues.length === 0;

  return {
    status: shortageCount > 0 ? 'INSUFFICIENT' : 'SUFFICIENT',
    totalValidStudents,
    totalAvailableSeats,
    capacityDifference,
    shortageCount,
    missingFieldsCount: missingFieldsDetails.length,
    missingFieldsDetails,
    duplicateRegNumbersCount: duplicateRegNos.size,
    duplicateDetails: Array.from(duplicateRegNos),
    canAllocate,
    blockingIssues,
    warnings,
  };
}
