import { describe, expect, it } from 'vitest';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import { DEFAULT_SEATING_RULES } from '../src/models/arrangement';
import { generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';

describe('Same-Branch Remainder Allocation on Vacant Benches (1 per bench)', () => {
  const createRoom = (id: string, name: string, rows: number, cols: number, studentsPerBench = 2, roomOrder = 1): Room => {
    const theoretical = rows * cols * studentsPerBench;
    return {
      id,
      name,
      rows,
      columns: cols,
      studentsPerBench,
      usableCapacity: theoretical,
      disabledSeats: [],
      active: true,
      roomOrder,
    };
  };

  it('allocates remaining same-branch students to vacant benches 1 per bench after alternating pairs are seated', () => {
    // Single room with 20 benches (capacity 40, 2 students per bench)
    const room = createRoom('r-1', 'Hall 1', 5, 4, 2);

    // 10 ECE candidates and 25 CSE candidates (total 35 candidates)
    const candidates: ExamCandidate[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `ece-${i + 1}`,
        registerNumber: `EC${String(i + 1).padStart(3, '0')}`,
        name: `ECE Student ${i + 1}`,
        branch: 'ECE',
        semester: 'S6',
        subjectCode: 'EC601',
      })),
      ...Array.from({ length: 25 }, (_, i) => ({
        id: `cse-${i + 1}`,
        registerNumber: `CS${String(i + 1).padStart(3, '0')}`,
        name: `CSE Student ${i + 1}`,
        branch: 'CSE',
        semester: 'S6',
        subjectCode: 'CS601',
      })),
    ];

    const result = generateConstraintAwareSeating(candidates, [room], DEFAULT_SEATING_RULES, {
      seed: 'test-same-branch-remainder-single-room',
    });

    // 20 benches can hold: 10 benches with 2 students (1 ECE + 1 CSE) = 20 seats
    // + 10 benches with 1 student (1 CSE each) = 10 seats
    // Total physical limit for this room = 30 students.
    // So 30 students are seated in this room (10 ECE + 20 CSE), and 5 excess CSE are unassigned because all 20 benches have a CSE.
    expect(result.assignments.length).toBe(30);
    expect(result.unassignedCandidates.length).toBe(5);

    // Group assignments by bench
    const benchMap = new Map<string, typeof result.assignments>();
    result.assignments.forEach((a) => {
      const key = `${a.row}-${a.column}`;
      const list = benchMap.get(key) || [];
      list.push(a);
      benchMap.set(key, list);
    });

    // All 20 physical benches must be utilized
    expect(benchMap.size).toBe(20);

    // Exactly 10 benches have 2 occupants (1 ECE, 1 CSE)
    const benchesWithTwo = Array.from(benchMap.values()).filter((list) => list.length === 2);
    expect(benchesWithTwo.length).toBe(10);

    benchesWithTwo.forEach((list) => {
      const branches = list.map((a) => {
        const c = candidates.find((cand) => cand.id === a.studentId);
        return c?.branch;
      });
      expect(branches).toContain('ECE');
      expect(branches).toContain('CSE');
    });

    // Exactly 10 benches have ONLY 1 occupant (the remaining CSE students, 1 per bench)
    const benchesWithOne = Array.from(benchMap.values()).filter((list) => list.length === 1);
    expect(benchesWithOne.length).toBe(10);

    benchesWithOne.forEach((list) => {
      const c = candidates.find((cand) => cand.id === list[0].studentId);
      expect(c?.branch).toBe('CSE');
      expect(list[0].position ?? list[0].seatIndex).toBe(0);
    });

    // Independent validator confirms zero C2/C3 violations
    const validation = validateSeatingPlanIndependently(result.assignments, candidates, [room]);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('allocates remaining same-branch candidates across multiple rooms on vacant benches (1 per bench)', () => {
    // Two rooms, each with 15 benches (capacity 30, 2 students per bench). Total benches = 30.
    const room1 = createRoom('r-1', 'Hall A', 5, 3, 2, 1);
    const room2 = createRoom('r-2', 'Hall B', 5, 3, 2, 2);

    // 10 ECE candidates and 25 CSE candidates (total 35 candidates)
    const candidates: ExamCandidate[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `ece-${i + 1}`,
        registerNumber: `EC${String(i + 1).padStart(3, '0')}`,
        name: `ECE Student ${i + 1}`,
        branch: 'ECE',
        semester: 'S6',
        subjectCode: 'EC601',
      })),
      ...Array.from({ length: 25 }, (_, i) => ({
        id: `cse-${i + 1}`,
        registerNumber: `CS${String(i + 1).padStart(3, '0')}`,
        name: `CSE Student ${i + 1}`,
        branch: 'CSE',
        semester: 'S6',
        subjectCode: 'CS601',
      })),
    ];

    const result = generateConstraintAwareSeating(candidates, [room1, room2], DEFAULT_SEATING_RULES, {
      seed: 'test-same-branch-remainder-multi-room',
    });

    // Across the 30 total benches in both rooms:
    // Room 1 (15 benches) seats 10 ECE + 15 CSE (10 benches with 2, 5 benches with 1) = 25 students.
    // Room 2 (15 benches) seats the remaining 10 CSE on 10 vacant benches (1 student per bench)!
    // ALL 35 candidates must be seated! 0 unassigned!
    expect(result.assignments.length).toBe(35);
    expect(result.unassignedCandidates.length).toBe(0);

    // Verify that NO bench has two students of the same branch
    const roomBenchMap = new Map<string, typeof result.assignments>();
    result.assignments.forEach((a) => {
      const key = `${a.roomId || a.classroomId}:${a.row}-${a.column}`;
      const list = roomBenchMap.get(key) || [];
      list.push(a);
      roomBenchMap.set(key, list);
    });

    roomBenchMap.forEach((occupants) => {
      if (occupants.length === 2) {
        const studentA = candidates.find((c) => c.id === occupants[0].studentId)!;
        const studentB = candidates.find((c) => c.id === occupants[1].studentId)!;
        // Never same branch on the same bench!
        expect(studentA.branch).not.toBe(studentB.branch);
      } else {
        expect(occupants.length).toBe(1);
      }
    });

    // Independent validator confirms zero violations
    const validation = validateSeatingPlanIndependently(result.assignments, candidates, [room1, room2]);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('strictly seats 1 student per bench when the entire cohort is from the same branch', () => {
    // 20 CSE candidates in a 20-bench room (capacity 40, 2 per bench)
    const room = createRoom('r-solo', 'Auditorium', 5, 4, 2);

    const candidates: ExamCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      id: `cs-${i + 1}`,
      registerNumber: `CS${String(i + 1).padStart(3, '0')}`,
      name: `CS Student ${i + 1}`,
      branch: 'CSE',
      semester: 'S6',
      subjectCode: 'CS601',
    }));

    const result = generateConstraintAwareSeating(candidates, [room], DEFAULT_SEATING_RULES, {
      seed: 'test-single-branch-all-candidates',
    });

    expect(result.assignments.length).toBe(20);
    expect(result.unassignedCandidates.length).toBe(0);

    // Each of the 20 benches must have exactly 1 student, at seatIndex 0
    result.assignments.forEach((a) => {
      expect(a.position ?? a.seatIndex).toBe(0);
    });

    const benchKeys = new Set(result.assignments.map((a) => `${a.row}-${a.column}`));
    expect(benchKeys.size).toBe(20);

    const validation = validateSeatingPlanIndependently(result.assignments, candidates, [room]);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });
});
