import { describe, expect, it } from 'vitest';
import type { Classroom } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { SeatingRules } from '../src/models/arrangement';
import {
  allocateStudentsToRooms,
  computeEqualRoomQuotas,
} from '../src/algorithms/roomAllocation';
import { generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';

describe('Equal Student Distribution Feature', () => {
  const createRoom = (
    id: string,
    name: string,
    rows: number,
    columns: number,
    benchCapacity = 2,
    roomOrder = 1
  ): Classroom => ({
    id,
    name,
    rows,
    columns,
    studentsPerBench: benchCapacity,
    benchCapacity,
    usableCapacity: rows * columns * benchCapacity,
    active: true,
    roomOrder,
  });

  const createCandidate = (
    id: string,
    reg: string,
    branch: string,
    subjectCode: string,
    semester = 'S5'
  ): ExamCandidate => ({
    id,
    registerNumber: reg,
    name: `Student ${reg}`,
    branch,
    semester,
    subjectCode,
  });

  describe('computeEqualRoomQuotas', () => {
    it('divides students equally when count divides cleanly across rooms', () => {
      const rooms = [
        { id: 'r1', capacity: 40 },
        { id: 'r2', capacity: 40 },
        { id: 'r3', capacity: 40 },
      ];
      const quotas = computeEqualRoomQuotas(rooms, 60);

      expect(quotas.get('r1')).toBe(20);
      expect(quotas.get('r2')).toBe(20);
      expect(quotas.get('r3')).toBe(20);
    });

    it('divides students almost equally (diff <= 1) when remainder exists', () => {
      const rooms = [
        { id: 'r1', capacity: 40 },
        { id: 'r2', capacity: 40 },
        { id: 'r3', capacity: 40 },
      ];
      const quotas = computeEqualRoomQuotas(rooms, 65);

      const q1 = quotas.get('r1')!;
      const q2 = quotas.get('r2')!;
      const q3 = quotas.get('r3')!;

      expect(q1 + q2 + q3).toBe(65);
      expect(Math.max(q1, q2, q3) - Math.min(q1, q2, q3)).toBeLessThanOrEqual(1);
      // 65 / 3 = 21 rem 2 -> two 22s and one 21
      expect([q1, q2, q3].sort()).toEqual([21, 22, 22]);
    });

    it('handles rooms with unequal capacities where smaller room is a bottleneck', () => {
      const rooms = [
        { id: 'r-small', capacity: 15 },
        { id: 'r-med1', capacity: 40 },
        { id: 'r-med2', capacity: 40 },
      ];
      // 65 students: ideal equal is 21.67, but r-small caps at 15.
      // Remaining 50 students divided equally among r-med1 and r-med2 -> 25 each.
      const quotas = computeEqualRoomQuotas(rooms, 65);

      expect(quotas.get('r-small')).toBe(15);
      expect(quotas.get('r-med1')).toBe(25);
      expect(quotas.get('r-med2')).toBe(25);
    });

    it('handles multiple sequential bottlenecks gracefully', () => {
      const rooms = [
        { id: 'r1', capacity: 5 },
        { id: 'r2', capacity: 15 },
        { id: 'r3', capacity: 50 },
        { id: 'r4', capacity: 50 },
      ];
      // 70 students:
      // Round 1 fair share: 70 / 4 = 17. r1 (5) and r2 (15) are <= 17.
      // r1 gets 5, r2 gets 15. Remaining: 50 students across r3 and r4.
      // Round 2 fair share: 50 / 2 = 25 each.
      const quotas = computeEqualRoomQuotas(rooms, 70);

      expect(quotas.get('r1')).toBe(5);
      expect(quotas.get('r2')).toBe(15);
      expect(quotas.get('r3')).toBe(25);
      expect(quotas.get('r4')).toBe(25);
    });

    it('caps total allocation at total room capacity when students exceed capacity', () => {
      const rooms = [
        { id: 'r1', capacity: 20 },
        { id: 'r2', capacity: 20 },
      ];
      const quotas = computeEqualRoomQuotas(rooms, 50);

      expect(quotas.get('r1')).toBe(20);
      expect(quotas.get('r2')).toBe(20);
    });

    it('handles more rooms than candidates cleanly', () => {
      const rooms = [
        { id: 'r1', capacity: 30 },
        { id: 'r2', capacity: 30 },
        { id: 'r3', capacity: 30 },
        { id: 'r4', capacity: 30 },
      ];
      const quotas = computeEqualRoomQuotas(rooms, 2);

      const counts = [
        quotas.get('r1')!,
        quotas.get('r2')!,
        quotas.get('r3')!,
        quotas.get('r4')!,
      ];
      expect(counts.reduce((a, b) => a + b, 0)).toBe(2);
      expect(counts.filter((c) => c === 1)).toHaveLength(2);
      expect(counts.filter((c) => c === 0)).toHaveLength(2);
    });

    it('returns zeroes when total students is 0', () => {
      const rooms = [
        { id: 'r1', capacity: 30 },
        { id: 'r2', capacity: 30 },
      ];
      const quotas = computeEqualRoomQuotas(rooms, 0);

      expect(quotas.get('r1')).toBe(0);
      expect(quotas.get('r2')).toBe(0);
    });
  });

  describe('allocateStudentsToRooms with equalStudentDistribution', () => {
    it('distributes students equally across all rooms when minimizeClassroomsUsed is false', () => {
      const rooms: Classroom[] = [
        createRoom('r1', 'Hall 101', 4, 5, 2, 1), // 40 cap
        createRoom('r2', 'Hall 102', 4, 5, 2, 2), // 40 cap
        createRoom('r3', 'Hall 103', 4, 5, 2, 3), // 40 cap
      ];

      // 60 students: 30 CS and 30 EC
      const students: ExamCandidate[] = [
        ...Array.from({ length: 30 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 30 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const allocation = allocateStudentsToRooms(students, rooms, 1, 'sequential', 'sorted', {
        minimizeClassroomsUsed: false,
        equalStudentDistribution: true,
      });

      expect(allocation.roomOccupancy['r1']).toBe(20);
      expect(allocation.roomOccupancy['r2']).toBe(20);
      expect(allocation.roomOccupancy['r3']).toBe(20);
    });

    it('distributes students equally across the minimal selected subset when minimizeClassroomsUsed is true', () => {
      const rooms: Classroom[] = [
        createRoom('r1', 'Hall 101', 4, 5, 2, 1), // 40 cap
        createRoom('r2', 'Hall 102', 4, 5, 2, 2), // 40 cap
        createRoom('r3', 'Hall 103', 4, 5, 2, 3), // 40 cap
        createRoom('r4', 'Hall 104', 4, 5, 2, 4), // 40 cap
        createRoom('r5', 'Hall 105', 4, 5, 2, 5), // 40 cap
      ];

      // 60 students: minimal rooms required = 2 rooms (capacity 80 >= 60)
      const students: ExamCandidate[] = [
        ...Array.from({ length: 30 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 30 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const allocation = allocateStudentsToRooms(students, rooms, 1, 'sequential', 'sorted', {
        minimizeClassroomsUsed: true,
        equalStudentDistribution: true,
      });

      const usedOccupancies = Object.values(allocation.roomOccupancy).filter((c) => c > 0);
      const emptyCount = Object.values(allocation.roomOccupancy).filter((c) => c === 0).length;

      // Exactly 2 rooms used, 3 empty
      expect(usedOccupancies).toHaveLength(2);
      expect(emptyCount).toBe(3);

      // And within the 2 used rooms, headcount is divided equally (30 each instead of 40 and 20)
      expect(usedOccupancies[0]).toBe(30);
      expect(usedOccupancies[1]).toBe(30);
    });

    it('distributes almost equally with difference <= 1 for non-divisible student counts', () => {
      const rooms: Classroom[] = [
        createRoom('r1', 'Hall 1', 4, 5, 2, 1), // 40 cap
        createRoom('r2', 'Hall 2', 4, 5, 2, 2), // 40 cap
        createRoom('r3', 'Hall 3', 4, 5, 2, 3), // 40 cap
      ];

      // 62 students across 3 rooms -> 21, 21, 20
      const students: ExamCandidate[] = [
        ...Array.from({ length: 31 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 31 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const allocation = allocateStudentsToRooms(students, rooms, 1, 'sequential', 'sorted', {
        minimizeClassroomsUsed: false,
        equalStudentDistribution: true,
      });

      const counts = [
        allocation.roomOccupancy['r1'],
        allocation.roomOccupancy['r2'],
        allocation.roomOccupancy['r3'],
      ].sort();

      expect(counts).toEqual([20, 21, 21]);
    });

    it('works identically with balanced strategy while keeping cohort distribution fair', () => {
      const rooms: Classroom[] = [
        createRoom('r1', 'Hall 1', 4, 5, 2, 1), // 40 cap
        createRoom('r2', 'Hall 2', 4, 5, 2, 2), // 40 cap
        createRoom('r3', 'Hall 3', 4, 5, 2, 3), // 40 cap
      ];

      const students: ExamCandidate[] = [
        ...Array.from({ length: 30 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 30 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const allocation = allocateStudentsToRooms(students, rooms, 1, 'balanced', 'sorted', {
        minimizeClassroomsUsed: false,
        equalStudentDistribution: true,
      });

      expect(allocation.roomOccupancy['r1']).toBe(20);
      expect(allocation.roomOccupancy['r2']).toBe(20);
      expect(allocation.roomOccupancy['r3']).toBe(20);
    });
  });

  describe('Full End-to-End Seating Generation with Equal Student Distribution', () => {
    it('generates completely valid seating satisfying all hard constraints with equal room headcount', () => {
      const rooms: Classroom[] = [
        createRoom('room-a', 'Hall A', 4, 4, 2, 1), // 32 cap
        createRoom('room-b', 'Hall B', 4, 4, 2, 2), // 32 cap
        createRoom('room-c', 'Hall C', 4, 4, 2, 3), // 32 cap
      ];

      // 48 students across 3 halls of 32 cap:
      // With equal distribution: each room should receive exactly 16 students!
      const students: ExamCandidate[] = [
        ...Array.from({ length: 24 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 24 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const rules: SeatingRules = {
        sameBenchSeparation: true,
        horizontalAdjacency: true,
        verticalAdjacency: true,
        diagonalAdjacency: false,
        sameSemesterSeparation: true,
        sameSubjectCodeSeparation: true,
        registerNumberOrder: 'sorted',
        minimizeClassroomsUsed: false,
        equalStudentDistribution: true,
        differentArrangementPerDate: false,
      };

      const result = generateConstraintAwareSeating(students, rooms, rules, {
        minimizeClassroomsUsed: false,
        equalStudentDistribution: true,
      });

      expect(result.unassignedCandidates).toHaveLength(0);
      expect(result.assignments).toHaveLength(48);

      // Verify each room has exactly 16 assignments
      const roomCounts = new Map<string, number>();
      result.assignments.forEach((a) => {
        roomCounts.set(a.classroomId, (roomCounts.get(a.classroomId) || 0) + 1);
      });

      expect(roomCounts.get('room-a')).toBe(16);
      expect(roomCounts.get('room-b')).toBe(16);
      expect(roomCounts.get('room-c')).toBe(16);

      // Verify independently decoupled validator reports valid and zero violations
      const validation = validateSeatingPlanIndependently(
        result.assignments,
        students,
        rooms,
        rules
      );

      expect(validation.isValid).toBe(true);
      expect(validation.status).toBe('Valid');
      expect(validation.violations).toHaveLength(0);
    });
  });
});
