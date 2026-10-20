import { describe, expect, it } from 'vitest';
import { validateSeatingCapacity } from '../src/algorithms/capacityValidator';
import { allocateStudentsToRooms } from '../src/algorithms/roomAllocation';
import {
  generateConstraintAwareSeating,
  checkBenchConflict,
} from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';
import { analyzeAllocationInfeasibility } from '../src/algorithms/infeasibilityAnalyzer';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { SeatingRules, AssignedSeat } from '../src/models/arrangement';

const defaultRules: SeatingRules = {
  sameBenchSeparation: true,
  horizontalAdjacency: false,
  verticalAdjacency: false,
  diagonalAdjacency: false,
  sameSemesterSeparation: true,
  sameSubjectCodeSeparation: true,
};

describe('Phase 3 — Allocation Engine & Independent Validator', () => {
  const sampleRooms: Room[] = [
    {
      id: 'room-101',
      name: 'Hall 101',
      rows: 4,
      columns: 3,
      studentsPerBench: 2, // 4 * 3 * 2 = 24 physical seats
      roomOrder: 1,
      active: true,
      disabledSeats: [],
    },
    {
      id: 'room-102',
      name: 'Hall 102',
      rows: 4,
      columns: 3,
      studentsPerBench: 2, // 24 physical seats
      roomOrder: 2,
      active: true,
      disabledSeats: [],
    },
  ];

  const createStudents = (count: number, branch = 'CS', sem = 'S5', sub = 'CS301', prefix = 'CS'): ExamCandidate[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `std-${prefix}-${i + 1}`,
      registerNumber: `${prefix}${String(i + 1).padStart(3, '0')}`,
      name: `Student ${prefix} ${i + 1}`,
      branch,
      semester: sem,
      subjectCode: sub,
    }));

  describe('TASK-3.1: Capacity & Pre-Allocation Gatekeeper', () => {
    it('blocks allocation when eligible candidates exceed active effective capacity (C1)', () => {
      const candidates = createStudents(50, 'CS'); // 50 candidates, rooms have 48 seats
      const result = validateSeatingCapacity(sampleRooms, candidates);

      expect(result.canAllocate).toBe(false);
      expect(result.status).toBe('INSUFFICIENT');
      expect(result.shortageCount).toBe(2);
      expect(result.blockingIssues[0]).toContain('Deficit: 2 seats');
    });

    it('blocks allocation when candidates are missing branch, semester, or subject code (C6)', () => {
      const candidates: ExamCandidate[] = [
        { id: '1', registerNumber: 'CS001', name: 'Alice', branch: '', semester: 'S5', subjectCode: 'CS301' },
        { id: '2', registerNumber: 'CS002', name: 'Bob', branch: 'CS', semester: '', subjectCode: 'CS301' },
        { id: '3', registerNumber: 'CS003', name: 'Charlie', branch: 'CS', semester: 'S5', subjectCode: '' },
      ];
      const result = validateSeatingCapacity(sampleRooms, candidates);

      expect(result.canAllocate).toBe(false);
      expect(result.missingFieldsCount).toBe(3);
      expect(result.blockingIssues.some((issue) => issue.includes('Constraint C6 Violation'))).toBe(true);
    });

    it('blocks allocation when duplicate register numbers exist (C4)', () => {
      const candidates: ExamCandidate[] = [
        { id: '1', registerNumber: 'CS001', name: 'Alice', branch: 'CS', semester: 'S5', subjectCode: 'CS301' },
        { id: '2', registerNumber: 'cs001', name: 'Alice Duplicate', branch: 'CS', semester: 'S5', subjectCode: 'CS301' },
      ];
      const result = validateSeatingCapacity(sampleRooms, candidates);

      expect(result.canAllocate).toBe(false);
      expect(result.duplicateRegNumbersCount).toBe(1);
      expect(result.blockingIssues.some((issue) => issue.includes('Constraint C4 Violation'))).toBe(true);
    });

    it('permits allocation when all pre-checks are satisfied', () => {
      const candidates = [
        ...createStudents(15, 'CS', 'S5', 'CS301', 'CS'),
        ...createStudents(15, 'EC', 'S5', 'EC301', 'EC'),
      ];
      const result = validateSeatingCapacity(sampleRooms, candidates);

      expect(result.canAllocate).toBe(true);
      expect(result.blockingIssues).toHaveLength(0);
    });
  });

  describe('TASK-3.2: Room-Fill & Candidate Distribution Strategies', () => {
    it('fills rooms sequentially in roomOrder under sequential strategy', () => {
      const candidates = [
        ...createStudents(16, 'CS', 'S5', 'CS301', 'CS'),
        ...createStudents(16, 'EC', 'S5', 'EC301', 'EC'),
      ]; // Total 32 candidates across two 24-seat rooms

      const result = allocateStudentsToRooms(candidates, sampleRooms, 42, 'sequential');

      // Room 101 should be completely filled to capacity (24)
      expect(result.roomOccupancy['room-101']).toBe(24);
      // Room 102 should receive the remaining (8)
      expect(result.roomOccupancy['room-102']).toBe(8);
    });

    it('distributes cohorts across rooms under balanced strategy', () => {
      const candidates = [
        ...createStudents(16, 'CS', 'S5', 'CS301', 'CS'),
        ...createStudents(16, 'EC', 'S5', 'EC301', 'EC'),
      ];

      const result = allocateStudentsToRooms(candidates, sampleRooms, 42, 'balanced');

      // Both rooms should have 16 candidates each
      expect(result.roomOccupancy['room-101']).toBe(16);
      expect(result.roomOccupancy['room-102']).toBe(16);
    });
  });

  describe('TASK-3.3: Bench Conflict Check & Pairwise Constraint Enforcement', () => {
    it('detects C2 subject conflict between bench occupants', () => {
      const candA: ExamCandidate = {
        id: '1', registerNumber: 'CS01', name: 'A', branch: 'CS', semester: 'S5', subjectCode: 'CS301',
      };
      const candB: ExamCandidate = {
        id: '2', registerNumber: 'ME01', name: 'B', branch: 'ME', semester: 'S3', subjectCode: 'CS301',
      };

      const check = checkBenchConflict(candA, [candB]);
      expect(check.hasConflict).toBe(true);
      expect(check.reason).toBe('subject');
    });

    it('detects C3 branch AND semester conflict between bench occupants', () => {
      const candA: ExamCandidate = {
        id: '1', registerNumber: 'CS01', name: 'A', branch: 'CS', semester: 'S5', subjectCode: 'CS301',
      };
      const candB: ExamCandidate = {
        id: '2', registerNumber: 'CS02', name: 'B', branch: 'CS', semester: 'S5', subjectCode: 'CS302',
      };

      const check = checkBenchConflict(candA, [candB]);
      expect(check.hasConflict).toBe(true);
      expect(check.reason).toBe('branch_semester');
    });

    it('permits same branch if semesters differ (no C3 violation)', () => {
      const candA: ExamCandidate = {
        id: '1', registerNumber: 'CS01', name: 'A', branch: 'CS', semester: 'S5', subjectCode: 'CS301',
      };
      const candB: ExamCandidate = {
        id: '2', registerNumber: 'CS02', name: 'B', branch: 'CS', semester: 'S3', subjectCode: 'CS302',
      };

      const check = checkBenchConflict(candA, [candB]);
      expect(check.hasConflict).toBe(false);
    });

    it('permits candidates with distinct subject, branch, and semester', () => {
      const candA: ExamCandidate = {
        id: '1', registerNumber: 'CS01', name: 'A', branch: 'CS', semester: 'S5', subjectCode: 'CS301',
      };
      const candB: ExamCandidate = {
        id: '2', registerNumber: 'EC01', name: 'B', branch: 'EC', semester: 'S5', subjectCode: 'EC301',
      };

      const check = checkBenchConflict(candA, [candB]);
      expect(check.hasConflict).toBe(false);
    });

    it('generates a 100% valid arrangement without hard conflicts on 2-person benches', () => {
      const candidates = [
        ...createStudents(12, 'CS', 'S5', 'CS301', 'CS'),
        ...createStudents(12, 'EC', 'S5', 'EC301', 'EC'),
      ]; // 24 candidates in Hall 101

      const result = generateConstraintAwareSeating(candidates, [sampleRooms[0]], defaultRules, { seed: 101 });

      expect(result.assignments).toHaveLength(24);
      expect(result.unassignedCandidates).toHaveLength(0);

      // Verify independently
      const validation = validateSeatingPlanIndependently(result.assignments, candidates, [sampleRooms[0]]);
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('is completely deterministic: identical seed yields identical assignments', () => {
      const candidates = [
        ...createStudents(10, 'CS', 'S5', 'CS301', 'CS'),
        ...createStudents(10, 'EC', 'S5', 'EC301', 'EC'),
      ];

      const run1 = generateConstraintAwareSeating(candidates, sampleRooms, defaultRules, { seed: 777 });
      const run2 = generateConstraintAwareSeating(candidates, sampleRooms, defaultRules, { seed: 777 });

      expect(run1.assignments).toEqual(run2.assignments);
    });
  });

  describe('TASK-3.4: Decoupled Independent Post-Allocation Validator', () => {
    const validCandidates: ExamCandidate[] = [
      { id: 'c1', registerNumber: 'CS001', name: 'Alice', branch: 'CS', semester: 'S5', subjectCode: 'CS301' },
      { id: 'c2', registerNumber: 'EC001', name: 'Bob', branch: 'EC', semester: 'S5', subjectCode: 'EC301' },
    ];

    it('passes a clean, compliant seating arrangement', () => {
      const assignments: AssignedSeat[] = [
        { classroomId: 'room-101', row: 0, column: 0, seatIndex: 0, studentId: 'c1', candidateId: 'c1', roomId: 'room-101', position: 0 },
        { classroomId: 'room-101', row: 0, column: 0, seatIndex: 1, studentId: 'c2', candidateId: 'c2', roomId: 'room-101', position: 1 },
      ];

      const result = validateSeatingPlanIndependently(assignments, validCandidates, [sampleRooms[0]]);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('catches intentional C2 corruption (same subject on same bench)', () => {
      const corruptedCandidates: ExamCandidate[] = [
        { id: 'c1', registerNumber: 'CS001', name: 'Alice', branch: 'CS', semester: 'S5', subjectCode: 'CS301' },
        { id: 'c2', registerNumber: 'ME001', name: 'Charlie', branch: 'ME', semester: 'S3', subjectCode: 'CS301' }, // Same subject!
      ];

      const corruptedAssignments: AssignedSeat[] = [
        { classroomId: 'room-101', row: 0, column: 0, seatIndex: 0, studentId: 'c1', candidateId: 'c1', roomId: 'room-101', position: 0 },
        { classroomId: 'room-101', row: 0, column: 0, seatIndex: 1, studentId: 'c2', candidateId: 'c2', roomId: 'room-101', position: 1 },
      ];

      const result = validateSeatingPlanIndependently(corruptedAssignments, corruptedCandidates, [sampleRooms[0]]);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.type === 'C2_SAME_BENCH_SUBJECT')).toBe(true);
    });

    it('catches intentional C3 corruption (same branch and semester on same bench)', () => {
      const corruptedCandidates: ExamCandidate[] = [
        { id: 'c1', registerNumber: 'CS001', name: 'Alice', branch: 'CS', semester: 'S5', subjectCode: 'CS301' },
        { id: 'c2', registerNumber: 'CS002', name: 'Bob', branch: 'CS', semester: 'S5', subjectCode: 'CS302' }, // Same branch & sem!
      ];

      const corruptedAssignments: AssignedSeat[] = [
        { classroomId: 'room-101', row: 0, column: 0, seatIndex: 0, studentId: 'c1', candidateId: 'c1', roomId: 'room-101', position: 0 },
        { classroomId: 'room-101', row: 0, column: 0, seatIndex: 1, studentId: 'c2', candidateId: 'c2', roomId: 'room-101', position: 1 },
      ];

      const result = validateSeatingPlanIndependently(corruptedAssignments, corruptedCandidates, [sampleRooms[0]]);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.type === 'C3_SAME_BENCH_BRANCH_SEMESTER')).toBe(true);
    });

    it('catches intentional C4 corruption (candidate booked twice)', () => {
      const corruptedAssignments: AssignedSeat[] = [
        { classroomId: 'room-101', row: 0, column: 0, seatIndex: 0, studentId: 'c1', candidateId: 'c1', roomId: 'room-101', position: 0 },
        { classroomId: 'room-101', row: 0, column: 1, seatIndex: 0, studentId: 'c1', candidateId: 'c1', roomId: 'room-101', position: 0 }, // Duplicate!
      ];

      const result = validateSeatingPlanIndependently(corruptedAssignments, validCandidates, [sampleRooms[0]]);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.type === 'C4_DUPLICATE_ASSIGNMENT')).toBe(true);
    });

    it('catches intentional C5 corruption (assigned to a disabled seat)', () => {
      const roomWithDisabledSeat: Room = {
        ...sampleRooms[0],
        disabledSeats: [{ row: 0, column: 0, seatIndex: 0 }],
      };

      const corruptedAssignments: AssignedSeat[] = [
        { classroomId: 'room-101', row: 0, column: 0, seatIndex: 0, studentId: 'c1', candidateId: 'c1', roomId: 'room-101', position: 0 },
      ];

      const result = validateSeatingPlanIndependently(corruptedAssignments, validCandidates, [roomWithDisabledSeat]);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.type === 'C5_INVALID_PHYSICAL_SEAT')).toBe(true);
    });

    it('catches intentional C1 corruption (room capacity exceeded)', () => {
      const smallRoom: Room = {
        id: 'tiny-room',
        name: 'Tiny Room',
        rows: 1,
        columns: 1,
        studentsPerBench: 1, // Effective capacity = 1
        disabledSeats: [],
      };

      const overAllocatedAssignments: AssignedSeat[] = [
        { classroomId: 'tiny-room', row: 0, column: 0, seatIndex: 0, studentId: 'c1', candidateId: 'c1', roomId: 'tiny-room', position: 0 },
        { classroomId: 'tiny-room', row: 0, column: 0, seatIndex: 1, studentId: 'c2', candidateId: 'c2', roomId: 'tiny-room', position: 1 },
      ];

      const result = validateSeatingPlanIndependently(overAllocatedAssignments, validCandidates, [smallRoom]);
      expect(result.isValid).toBe(false);
      expect(result.violations.some((v) => v.type === 'C1_CAPACITY_EXCEEDED')).toBe(true);
    });
  });

  describe('TASK-3.5: Allocation Infeasibility & Actionable Reporting', () => {
    it('diagnoses pigeonhole subject dominance when one subject exceeds compatible benches', () => {
      // 20 candidates all having the exact same subject CS301 in a 24-seat room with 2-person benches
      // Only 12 benches exist! Max compatible CS301 candidates is 12!
      const dominantCandidates = createStudents(20, 'CS', 'S5', 'CS301');

      const report = analyzeAllocationInfeasibility(dominantCandidates, [sampleRooms[0]], []);

      expect(report.diagnosisType).toBe('PIGEONHOLE_SUBJECT_DOMINANCE');
      expect(report.explanation).toContain('Constraint C2');
      expect(report.recommendations.some((r) => r.actionType === 'change_bench_occupancy')).toBe(true);
    });

    it('diagnoses companion isolation when unassigned candidates exist', () => {
      const candidates = createStudents(10, 'CS');
      const unassigned = [
        {
          candidateId: 'u1',
          registerNumber: 'CS999',
          name: 'Isolated Student',
          branch: 'CS',
          semester: 'S5',
          subjectCode: 'CS301',
          reason: 'No compatible bench companion found',
        },
      ];

      const report = analyzeAllocationInfeasibility(candidates, [sampleRooms[0]], unassigned);

      expect(report.diagnosisType).toBe('BENCH_COMPANION_ISOLATION');
      expect(report.unassignedCount).toBe(1);
      expect(report.recommendations.some((r) => r.actionType === 'add_rooms')).toBe(true);
    });
  });
});
