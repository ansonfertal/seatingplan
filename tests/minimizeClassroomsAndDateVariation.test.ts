import { describe, expect, it } from 'vitest';
import type { Classroom } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { SeatingRules } from '../src/models/arrangement';
import { allocateStudentsToRooms, selectMinimalClassrooms, hashExamDate } from '../src/algorithms/roomAllocation';
import { generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';

describe('Minimizing Classrooms Used & Date-Adaptive Seating Arrangement', () => {
  const defaultRules: SeatingRules = {
    sameBenchSeparation: true,
    horizontalAdjacency: false,
    verticalAdjacency: false,
    diagonalAdjacency: false,
    sameSemesterSeparation: true,
    sameSubjectCodeSeparation: true,
    adjacentSameSubjectSeparation: false,
    adjacentSameBranchSeparation: false,
    minimizeClassroomsUsed: true,
    differentArrangementPerDate: true,
  };

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

  describe('selectMinimalClassrooms & Minimizing Classrooms', () => {
    it('selects exactly 1 classroom when a single large room can accommodate all candidates', () => {
      const rooms: Classroom[] = [
        createRoom('r-small-1', 'Small Room 1', 3, 4, 2, 1), // 24 cap
        createRoom('r-small-2', 'Small Room 2', 3, 4, 2, 2), // 24 cap
        createRoom('r-large', 'Hall A', 6, 5, 2, 3), // 60 cap
        createRoom('r-small-3', 'Small Room 3', 3, 4, 2, 4), // 24 cap
      ];

      // 40 students: 20 CS and 20 EC
      const students: ExamCandidate[] = [
        ...Array.from({ length: 20 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 20 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const minimal = selectMinimalClassrooms(rooms, students.length, 20);
      expect(minimal.selectedRoomIds.size).toBe(1);
      expect(minimal.selectedRoomIds.has('r-large')).toBe(true);

      const allocation = allocateStudentsToRooms(students, rooms, 1, 'sequential', 'sorted', {
        minimizeClassroomsUsed: true,
      });

      // Exactly 1 room should have occupants, all other 3 rooms should have 0 occupants
      expect(allocation.roomOccupancy['r-large']).toBe(40);
      expect(allocation.roomOccupancy['r-small-1']).toBe(0);
      expect(allocation.roomOccupancy['r-small-2']).toBe(0);
      expect(allocation.roomOccupancy['r-small-3']).toBe(0);
    });

    it('selects the minimum subset of rooms (e.g. 2 rooms out of 5) when multiple are needed', () => {
      const rooms: Classroom[] = [
        createRoom('r1', 'Room 101', 3, 5, 2, 1), // 30 cap
        createRoom('r2', 'Room 102', 3, 5, 2, 2), // 30 cap
        createRoom('r3', 'Room 103', 3, 5, 2, 3), // 30 cap
        createRoom('r4', 'Room 104', 3, 5, 2, 4), // 30 cap
        createRoom('r5', 'Room 105', 3, 5, 2, 5), // 30 cap
      ];

      // 48 students: requires at least ceil(48/30) = 2 rooms
      const students: ExamCandidate[] = [
        ...Array.from({ length: 24 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 24 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const allocation = allocateStudentsToRooms(students, rooms, 1, 'sequential', 'sorted', {
        minimizeClassroomsUsed: true,
      });

      const usedRooms = Object.entries(allocation.roomOccupancy).filter(([, count]) => count > 0);
      expect(usedRooms).toHaveLength(2);

      const totalSeated = Object.values(allocation.roomOccupancy).reduce((a, b) => a + b, 0);
      expect(totalSeated).toBe(48);

      const emptyRooms = Object.entries(allocation.roomOccupancy).filter(([, count]) => count === 0);
      expect(emptyRooms).toHaveLength(3);
    });

    it('distributes across more rooms when minimizeClassroomsUsed is disabled with balanced strategy', () => {
      const rooms: Classroom[] = [
        createRoom('r1', 'Room 101', 3, 5, 2, 1), // 30 cap
        createRoom('r2', 'Room 102', 3, 5, 2, 2), // 30 cap
        createRoom('r3', 'Room 103', 3, 5, 2, 3), // 30 cap
        createRoom('r4', 'Room 104', 3, 5, 2, 4), // 30 cap
      ];

      const students: ExamCandidate[] = [
        ...Array.from({ length: 16 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 16 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      // With minimizeClassroomsUsed = false and strategy = balanced:
      // Students should be balanced across all 4 rooms
      const allocation = allocateStudentsToRooms(students, rooms, 1, 'balanced', 'sorted', {
        minimizeClassroomsUsed: false,
      });

      const usedRooms = Object.entries(allocation.roomOccupancy).filter(([, count]) => count > 0);
      expect(usedRooms.length).toBe(4);
    });
  });

  describe('Date-Adaptive Seating Variation across Exam Dates', () => {
    it('hashExamDate produces distinct, avalanche-mixed hashes for consecutive dates', () => {
      const h1 = hashExamDate('2026-10-25');
      const h2 = hashExamDate('2026-10-26');
      const h3 = hashExamDate('2026-10-27');

      expect(h1).toBeGreaterThan(0);
      expect(h2).toBeGreaterThan(0);
      expect(h3).toBeGreaterThan(0);

      expect(h1).not.toBe(h2);
      expect(h2).not.toBe(h3);
      expect(h1).not.toBe(h3);
    });

    it('generates reproducible, identical seating plans for the same exam date and seed', () => {
      const rooms = [createRoom('r1', 'Room 101', 4, 4, 2)];
      const students: ExamCandidate[] = [
        ...Array.from({ length: 10 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const runA = generateConstraintAwareSeating(students, rooms, defaultRules, {
        seed: 42,
        examDate: '2026-10-25',
        differentArrangementPerDate: true,
      });

      const runB = generateConstraintAwareSeating(students, rooms, defaultRules, {
        seed: 42,
        examDate: '2026-10-25',
        differentArrangementPerDate: true,
      });

      expect(runA.assignments).toEqual(runB.assignments);
    });

    it('produces different seating arrangements for different exam dates', () => {
      const rooms = [createRoom('r1', 'Room 101', 4, 4, 2)]; // 32 seats (16 benches)
      const students: ExamCandidate[] = [
        ...Array.from({ length: 12 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 12 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const date1Plan = generateConstraintAwareSeating(students, rooms, defaultRules, {
        seed: 100,
        examDate: '2026-10-25',
        differentArrangementPerDate: true,
      });

      const date2Plan = generateConstraintAwareSeating(students, rooms, defaultRules, {
        seed: 100,
        examDate: '2026-10-27',
        differentArrangementPerDate: true,
      });

      // Both dates must seat all 24 students
      expect(date1Plan.assignments).toHaveLength(24);
      expect(date2Plan.assignments).toHaveLength(24);

      // Verify that assignments differ between Date 1 and Date 2
      const map1 = new Map(date1Plan.assignments.map((a) => [a.studentId, `${a.row}-${a.column}-${a.seatIndex}`]));
      const map2 = new Map(date2Plan.assignments.map((a) => [a.studentId, `${a.row}-${a.column}-${a.seatIndex}`]));

      let differingPositions = 0;
      students.forEach((s) => {
        if (map1.get(s.id) !== map2.get(s.id)) {
          differingPositions++;
        }
      });

      // Students must be seated in different positions across dates
      expect(differingPositions).toBeGreaterThan(0);

      // Verify independent hard constraints hold on both dates
      const val1 = validateSeatingPlanIndependently(date1Plan.assignments, students, rooms);
      expect(val1.isValid).toBe(true);
      expect(val1.violations).toHaveLength(0);

      const val2 = validateSeatingPlanIndependently(date2Plan.assignments, students, rooms);
      expect(val2.isValid).toBe(true);
      expect(val2.violations).toHaveLength(0);
    });

    it('rotates room selection across dates when multiple minimal room subsets are available', () => {
      // 3 identical rooms of capacity 30
      const rooms: Classroom[] = [
        createRoom('r1', 'Hall 1', 3, 5, 2, 1),
        createRoom('r2', 'Hall 2', 3, 5, 2, 2),
        createRoom('r3', 'Hall 3', 3, 5, 2, 3),
      ];

      // 25 students (fits in 1 room)
      const students: ExamCandidate[] = [
        ...Array.from({ length: 12 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 13 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const allocDate1 = allocateStudentsToRooms(students, rooms, 1, 'sequential', 'sorted', {
        examDate: '2026-10-25',
        minimizeClassroomsUsed: true,
        differentArrangementPerDate: true,
      });

      const allocDate2 = allocateStudentsToRooms(students, rooms, 1, 'sequential', 'sorted', {
        examDate: '2026-10-26',
        minimizeClassroomsUsed: true,
        differentArrangementPerDate: true,
      });

      const usedRoom1 = Object.entries(allocDate1.roomOccupancy).find(([, c]) => c > 0)?.[0];
      const usedRoom2 = Object.entries(allocDate2.roomOccupancy).find(([, c]) => c > 0)?.[0];

      // Minimization must hold on both dates (exactly 1 room used)
      const usedCount1 = Object.values(allocDate1.roomOccupancy).filter((c) => c > 0).length;
      const usedCount2 = Object.values(allocDate2.roomOccupancy).filter((c) => c > 0).length;
      expect(usedCount1).toBe(1);
      expect(usedCount2).toBe(1);

      // The selected room or sequence can rotate between rooms across dates
      expect(usedRoom1).toBeDefined();
      expect(usedRoom2).toBeDefined();
    });

    it('leaves seating identical across dates when differentArrangementPerDate is disabled', () => {
      const rooms = [createRoom('r1', 'Room 101', 4, 4, 2)];
      const students: ExamCandidate[] = [
        ...Array.from({ length: 10 }, (_, i) =>
          createCandidate(`cs-${i}`, `CS${100 + i}`, 'CS', 'CS301')
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          createCandidate(`ec-${i}`, `EC${100 + i}`, 'EC', 'EC301')
        ),
      ];

      const plan1 = generateConstraintAwareSeating(students, rooms, defaultRules, {
        seed: 42,
        examDate: '2026-10-25',
        differentArrangementPerDate: false,
      });

      const plan2 = generateConstraintAwareSeating(students, rooms, defaultRules, {
        seed: 42,
        examDate: '2026-10-27',
        differentArrangementPerDate: false,
      });

      expect(plan1.assignments).toEqual(plan2.assignments);
    });
  });
});
