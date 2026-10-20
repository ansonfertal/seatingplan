import { describe, expect, it } from 'vitest';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import { DEFAULT_SEATING_RULES } from '../src/models/arrangement';
import { generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';

describe('Candidate Register Number Ordering (Sorted vs Random)', () => {
  const createRoom = (id: string, name: string, rows: number, cols: number, studentsPerBench = 2, roomOrder = 1): Room => ({
    id,
    name,
    rows,
    columns: cols,
    studentsPerBench,
    usableCapacity: rows * cols * studentsPerBench,
    disabledSeats: [],
    active: true,
    roomOrder,
  });

  const createCohort = (count: number, branch: string, subjectCode: string, prefix: string): ExamCandidate[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `${prefix.toLowerCase()}-${i + 1}`,
      registerNumber: `${prefix}${String(i + 1).padStart(3, '0')}`,
      name: `${prefix} Student ${i + 1}`,
      branch,
      semester: 'S6',
      subjectCode,
    }));

  it('assigns candidates in strictly ascending register number order when registerNumberOrder is "sorted"', () => {
    // 10 CS students (CS001..CS010) and 10 EC students (EC001..EC010)
    const csStudents = createCohort(10, 'CSE', 'CS601', 'CS');
    const ecStudents = createCohort(10, 'ECE', 'EC601', 'EC');
    const candidates = [...csStudents, ...ecStudents];

    // Single room with 10 benches (5x2, 2 per bench, capacity 20)
    const room = createRoom('r1', 'Hall 101', 5, 2, 2);

    const result = generateConstraintAwareSeating(
      candidates,
      [room],
      { ...DEFAULT_SEATING_RULES, registerNumberOrder: 'sorted' },
      { seed: 'seed-sort-test', registerNumberOrder: 'sorted' }
    );

    expect(result.assignments).toHaveLength(20);
    expect(result.unassignedCandidates).toHaveLength(0);

    // Filter assignments for CSE
    const cseAssignments = result.assignments
      .filter((a) => {
        const c = candidates.find((cand) => cand.id === a.studentId);
        return c?.branch === 'CSE';
      })
      // Sort assignments by physical seat order: seatIndex, row, column
      .sort((a, b) => {
        if (a.seatIndex !== b.seatIndex) return a.seatIndex - b.seatIndex;
        if (a.row !== b.row) return a.row - b.row;
        return a.column - b.column;
      });

    const cseRegs = cseAssignments.map((a) => {
      const c = candidates.find((cand) => cand.id === a.studentId);
      return c?.registerNumber;
    });

    // Register numbers must be in ascending order: CS001, CS002, ..., CS010
    expect(cseRegs).toEqual([
      'CS001', 'CS002', 'CS003', 'CS004', 'CS005',
      'CS006', 'CS007', 'CS008', 'CS009', 'CS010',
    ]);

    // Filter assignments for ECE
    const eceAssignments = result.assignments
      .filter((a) => {
        const c = candidates.find((cand) => cand.id === a.studentId);
        return c?.branch === 'ECE';
      })
      .sort((a, b) => {
        if (a.seatIndex !== b.seatIndex) return a.seatIndex - b.seatIndex;
        if (a.row !== b.row) return a.row - b.row;
        return a.column - b.column;
      });

    const eceRegs = eceAssignments.map((a) => {
      const c = candidates.find((cand) => cand.id === a.studentId);
      return c?.registerNumber;
    });

    expect(eceRegs).toEqual([
      'EC001', 'EC002', 'EC003', 'EC004', 'EC005',
      'EC006', 'EC007', 'EC008', 'EC009', 'EC010',
    ]);

    // Validation passes independently
    const validation = validateSeatingPlanIndependently(result.assignments, candidates, [room]);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('allocates sequential register numbers across multiple rooms in ascending order', () => {
    // 30 CS candidates across two 15-bench halls (Hall A: 15 seats, Hall B: 15 seats with 1 student per bench)
    const candidates = createCohort(30, 'CSE', 'CS601', 'CS');
    const roomA = createRoom('hall-a', 'Hall A', 5, 3, 1, 1); // 15 benches
    const roomB = createRoom('hall-b', 'Hall B', 5, 3, 1, 2); // 15 benches

    const result = generateConstraintAwareSeating(
      candidates,
      [roomA, roomB],
      { ...DEFAULT_SEATING_RULES, registerNumberOrder: 'sorted' },
      { seed: 'multi-room-sort', strategy: 'sequential', registerNumberOrder: 'sorted' }
    );

    expect(result.assignments).toHaveLength(30);

    // Hall A must receive the first 15 candidates: CS001 to CS015
    const hallAAssignments = result.assignments
      .filter((a) => (a.roomId || a.classroomId) === 'hall-a')
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.column - b.column;
      });

    const hallARegs = hallAAssignments.map((a) => {
      const c = candidates.find((cand) => cand.id === a.studentId);
      return c?.registerNumber;
    });

    expect(hallARegs).toHaveLength(15);
    expect(hallARegs[0]).toBe('CS001');
    expect(hallARegs[14]).toBe('CS015');

    // Hall B must receive the subsequent 15 candidates: CS016 to CS030
    const hallBAssignments = result.assignments
      .filter((a) => (a.roomId || a.classroomId) === 'hall-b')
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.column - b.column;
      });

    const hallBRegs = hallBAssignments.map((a) => {
      const c = candidates.find((cand) => cand.id === a.studentId);
      return c?.registerNumber;
    });

    expect(hallBRegs).toHaveLength(15);
    expect(hallBRegs[0]).toBe('CS016');
    expect(hallBRegs[14]).toBe('CS030');
  });

  it('shuffles register numbers randomly when registerNumberOrder is "random"', () => {
    // 25 CS candidates in a 25-bench room
    const candidates = createCohort(25, 'CSE', 'CS601', 'CS');
    const room = createRoom('r-rand', 'Hall Random', 5, 5, 1);

    const result = generateConstraintAwareSeating(
      candidates,
      [room],
      { ...DEFAULT_SEATING_RULES, registerNumberOrder: 'random' },
      { seed: 'random-seed-42', registerNumberOrder: 'random' }
    );

    expect(result.assignments).toHaveLength(25);

    const orderedSeats = result.assignments
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.column - b.column;
      })
      .map((a) => {
        const c = candidates.find((cand) => cand.id === a.studentId);
        return c?.registerNumber;
      });

    const sortedRegs = candidates.map((c) => c.registerNumber);

    // Random order must NOT be identical to strictly sorted order
    expect(orderedSeats).not.toEqual(sortedRegs);

    // But deterministic seed must reproduce the EXACT same random sequence
    const result2 = generateConstraintAwareSeating(
      candidates,
      [room],
      { ...DEFAULT_SEATING_RULES, registerNumberOrder: 'random' },
      { seed: 'random-seed-42', registerNumberOrder: 'random' }
    );

    const orderedSeats2 = result2.assignments
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.column - b.column;
      })
      .map((a) => {
        const c = candidates.find((cand) => cand.id === a.studentId);
        return c?.registerNumber;
      });

    expect(orderedSeats2).toEqual(orderedSeats);
  });
});
