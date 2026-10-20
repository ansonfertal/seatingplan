import { describe, it, expect } from 'vitest';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import {
  checkSameSubjectBenchConflict,
  autoAdjustRoomsForSubjectConflict,
} from '../src/algorithms/subjectConflictDetector';
import { generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';
import { DEFAULT_SEATING_RULES } from '../src/models/arrangement';

describe('Same-Subject Bench Conflict Auto-Adjustment (Constraint C2)', () => {
  const mockSameSubjectStudents: ExamCandidate[] = Array.from({ length: 20 }, (_, i) => ({
    id: `s-${i + 1}`,
    registerNumber: `2026CS${String(i + 1).padStart(3, '0')}`,
    name: `Student ${i + 1}`,
    branch: 'CSE',
    semester: 6,
    subjectCode: 'CS601', // Single subject across all candidates
    examDate: '2026-10-25',
    session: 'FN',
  }));

  const mockTwoSeaterRoom: Room = {
    id: 'room-101',
    name: 'Hall 101',
    rows: 5,
    columns: 4,
    studentsPerBench: 2, // 20 physical benches, 40 seats
    disabledSeats: [],
    usableCapacity: 40,
    active: true,
  };

  it('detects a conflict when candidates share the same subject code and room has 2 students per bench', () => {
    const conflictResult = checkSameSubjectBenchConflict(mockSameSubjectStudents, [mockTwoSeaterRoom]);

    expect(conflictResult.hasConflict).toBe(true);
    expect(conflictResult.conflictingSubjects).toContain('CS601');
    expect(conflictResult.roomsNeedingAdjustment.length).toBe(1);
    expect(conflictResult.roomsNeedingAdjustment[0].id).toBe('room-101');
    expect(conflictResult.reason).toContain('Constraint C2');
  });

  it('reports no conflict when room is already configured with 1 student per bench', () => {
    const singleSeaterRoom: Room = {
      ...mockTwoSeaterRoom,
      id: 'room-102',
      studentsPerBench: 1,
      usableCapacity: 20,
    };

    const conflictResult = checkSameSubjectBenchConflict(mockSameSubjectStudents, [singleSeaterRoom]);

    expect(conflictResult.hasConflict).toBe(false);
    expect(conflictResult.roomsNeedingAdjustment.length).toBe(0);
  });

  it('reports no conflict when candidates belong to distinct alternating subjects that can share benches', () => {
    const multiSubjectStudents: ExamCandidate[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `cs-${i + 1}`,
        registerNumber: `CS${i + 1}`,
        name: `CS Student ${i + 1}`,
        branch: 'CSE',
        semester: 6,
        subjectCode: 'CS601',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `ec-${i + 1}`,
        registerNumber: `EC${i + 1}`,
        name: `EC Student ${i + 1}`,
        branch: 'ECE',
        semester: 6,
        subjectCode: 'EC601',
      })),
    ];

    const conflictResult = checkSameSubjectBenchConflict(multiSubjectStudents, [mockTwoSeaterRoom]);

    expect(conflictResult.hasConflict).toBe(false);
    expect(conflictResult.roomsNeedingAdjustment.length).toBe(0);
  });

  it('autoAdjustRoomsForSubjectConflict updates studentsPerBench from 2 to 1 and recalculates capacity', () => {
    const conflictResult = checkSameSubjectBenchConflict(mockSameSubjectStudents, [mockTwoSeaterRoom]);
    const { adjustedRooms, adjustedCount, changedRoomNames } = autoAdjustRoomsForSubjectConflict(
      [mockTwoSeaterRoom],
      conflictResult
    );

    expect(adjustedCount).toBe(1);
    expect(changedRoomNames).toContain('Hall 101');
    expect(adjustedRooms[0].studentsPerBench).toBe(1);
    // 5 rows * 4 cols * 1 student/bench = 20 usable capacity
    expect(adjustedRooms[0].usableCapacity).toBe(20);
  });

  it('allocation engine automatically distributes students 1 per bench when there are more benches than students', () => {
    // 15 candidates in a room with 20 benches (and 2 students per bench = 40 capacity)
    const candidates = mockSameSubjectStudents.slice(0, 15);
    const result = generateConstraintAwareSeating(
      candidates,
      [mockTwoSeaterRoom],
      DEFAULT_SEATING_RULES,
      { seed: 'test-distribute-1-per-bench' }
    );

    expect(result.assignments.length).toBe(15);
    expect(result.unassignedCandidates.length).toBe(0);

    // Verify each candidate is seated on their own distinct bench (1 student per bench)
    result.assignments.forEach((a) => {
      expect(a.position ?? a.seatIndex).toBe(0);
    });

    const benchKeys = result.assignments.map((a) => `${a.row}-${a.column}`);
    const uniqueBenchKeys = new Set(benchKeys);
    expect(uniqueBenchKeys.size).toBe(15);

    // Verify room definition was NOT modified/downgraded by software
    expect(mockTwoSeaterRoom.studentsPerBench).toBe(2);
    expect(mockTwoSeaterRoom.usableCapacity).toBe(40);

    // Run independent validator
    const validation = validateSeatingPlanIndependently(result.assignments, candidates, [mockTwoSeaterRoom]);
    expect(validation.isValid).toBe(true);
    expect(validation.violations.length).toBe(0);
  });

  it('allocates 1 student per bench first before placing second student on benches when candidates exceed bench count', () => {
    // 25 candidates (15 CSE CS601, 10 ECE EC601) in 20 benches (capacity 40)
    const mixedCandidates: ExamCandidate[] = [
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `cs-${i + 1}`,
        registerNumber: `CS${String(i + 1).padStart(3, '0')}`,
        name: `CS Student ${i + 1}`,
        branch: 'CSE',
        semester: 6,
        subjectCode: 'CS601',
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `ec-${i + 1}`,
        registerNumber: `EC${String(i + 1).padStart(3, '0')}`,
        name: `EC Student ${i + 1}`,
        branch: 'ECE',
        semester: 6,
        subjectCode: 'EC601',
      })),
    ];

    const result = generateConstraintAwareSeating(
      mixedCandidates,
      [mockTwoSeaterRoom],
      DEFAULT_SEATING_RULES,
      { seed: 'test-25-candidates-20-benches' }
    );

    expect(result.assignments.length).toBe(25);
    expect(result.unassignedCandidates.length).toBe(0);

    // All 20 physical benches must have at least 1 student
    const benchKeys = result.assignments.map((a) => `${a.row}-${a.column}`);
    const uniqueBenches = new Set(benchKeys);
    expect(uniqueBenches.size).toBe(20);

    // Exactly 5 benches have 2 students (25 - 20 = 5)
    const benchCounts = new Map<string, number>();
    benchKeys.forEach((k) => benchCounts.set(k, (benchCounts.get(k) || 0) + 1));
    const benchesWithTwo = Array.from(benchCounts.values()).filter((cnt) => cnt === 2);
    expect(benchesWithTwo.length).toBe(5);

    // Independent validator confirms zero C2/C3 violations
    const validation = validateSeatingPlanIndependently(result.assignments, mixedCandidates, [mockTwoSeaterRoom]);
    expect(validation.isValid).toBe(true);
    expect(validation.violations.length).toBe(0);
  });
});
