import { describe, expect, it } from 'vitest';
import type { Room } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { SeatingRules } from '../src/models/arrangement';
import { buildSeatGraph } from '../src/algorithms/seatGraph';
import { generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';
import { validateProposedSwap } from '../src/algorithms/swapValidator';

describe('TASK-7.1: Neighboring-Bench & Diagonal Adjacency Constraint Engine', () => {
  const baseRules: SeatingRules = {
    sameBenchSeparation: true,
    horizontalAdjacency: true,
    verticalAdjacency: true,
    diagonalAdjacency: true,
    sameSemesterSeparation: true,
    sameSubjectCodeSeparation: true,
    strictAdjacency: true,
    adjacentSameBranchSeparation: true,
    adjacentSameSubjectSeparation: true,
  };

  const createRoom = (rows: number, cols: number, studentsPerBench: number): Room => {
    const theoretical = rows * cols * studentsPerBench;
    return {
      id: 'hall-adv',
      name: 'Hall Advanced',
      rows,
      columns: cols,
      studentsPerBench,
      capacity: theoretical,
      usableCapacity: theoretical,
      disabledSeats: [],
      active: true,
      roomOrder: 1,
    };
  };

  it('buildSeatGraph connects all seats of horizontally, vertically, and diagonally adjacent benches', () => {
    // 2x2 room with 2 students per bench (8 total seats)
    const room = createRoom(2, 2, 2);
    const graph = buildSeatGraph(room, baseRules);

    // Bench (0,0) seat 0
    const seat00_0 = graph.nodes.find((n) => n.row === 0 && n.column === 0 && n.seatIndex === 0)!;
    const neighbors = graph.adjacency[seat00_0.key];

    // Must connect to same-bench partner (0,0,1)
    expect(neighbors).toContain('0-0-1');

    // Horizontal neighbor bench (0,1): must connect to both seat 0 and seat 1
    expect(neighbors).toContain('0-1-0');
    expect(neighbors).toContain('0-1-1');

    // Vertical neighbor bench (1,0): must connect to both seat 0 and seat 1
    expect(neighbors).toContain('1-0-0');
    expect(neighbors).toContain('1-0-1');

    // Diagonal neighbor bench (1,1): must connect to both seat 0 and seat 1
    expect(neighbors).toContain('1-1-0');
    expect(neighbors).toContain('1-1-1');
  });

  it('allocates candidates while strictly preventing same-subject or same-branch students on adjacent benches', () => {
    // 4 students: 2 from CSE (CS101) and 2 from ECE (EC101)
    const candidates: ExamCandidate[] = [
      { id: 'c1', registerNumber: 'CS01', name: 'CS Student 1', branch: 'CSE', semester: '4', subjectCode: 'CS101' },
      { id: 'c2', registerNumber: 'CS02', name: 'CS Student 2', branch: 'CSE', semester: '4', subjectCode: 'CS101' },
      { id: 'e1', registerNumber: 'EC01', name: 'EC Student 1', branch: 'ECE', semester: '4', subjectCode: 'EC101' },
      { id: 'e2', registerNumber: 'EC02', name: 'EC Student 2', branch: 'ECE', semester: '4', subjectCode: 'EC101' },
    ];

    // 2x2 room with 1 student per bench (4 benches)
    // To satisfy horizontal, vertical, and diagonal adjacency separation between matching branches/subjects,
    // exactly 2 can be placed if diagonal separation is strictly enforced, or placed in non-adjacent positions.
    const room = createRoom(2, 2, 1);

    const result = generateConstraintAwareSeating(candidates, [room], baseRules, { seed: 42 });

    // Validate using independent validator with strictAdjacency
    const validation = validateSeatingPlanIndependently(result.assignments, candidates, [room], baseRules);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);

    // Verify no two adjacent benches have the same branch or subject
    const seatMap = new Map<string, ExamCandidate>();
    result.assignments.forEach((a) => {
      const c = candidates.find((cand) => cand.id === (a.studentId || a.candidateId));
      if (c) seatMap.set(`${a.row}-${a.column}`, c);
    });

    // Check all adjacent pairs
    const coords = Array.from(seatMap.keys());
    for (let i = 0; i < coords.length; i++) {
      for (let j = i + 1; j < coords.length; j++) {
        const [r1, c1] = coords[i].split('-').map(Number);
        const [r2, c2] = coords[j].split('-').map(Number);
        const isAdj = Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
        if (isAdj) {
          const candA = seatMap.get(coords[i])!;
          const candB = seatMap.get(coords[j])!;
          expect(candA.branch).not.toBe(candB.branch);
          expect(candA.subjectCode).not.toBe(candB.subjectCode);
        }
      }
    }
  });

  it('independentValidator flags C7_ADJACENT_BENCH_CONFLICT when two same-branch candidates are manually placed on adjacent benches', () => {
    const candidates: ExamCandidate[] = [
      { id: 'c1', registerNumber: 'CS01', name: 'CS Student 1', branch: 'CSE', semester: '4', subjectCode: 'CS101' },
      { id: 'c2', registerNumber: 'CS02', name: 'CS Student 2', branch: 'CSE', semester: '4', subjectCode: 'CS102' },
    ];

    const room = createRoom(2, 2, 1);

    // Force assignments on horizontally adjacent benches: (0,0) and (0,1)
    const corruptedAssignments = [
      { studentId: 'c1', candidateId: 'c1', roomId: room.id, row: 0, column: 0, seatIndex: 0 },
      { studentId: 'c2', candidateId: 'c2', roomId: room.id, row: 0, column: 1, seatIndex: 0 },
    ];

    const validation = validateSeatingPlanIndependently(corruptedAssignments, candidates, [room], baseRules);

    expect(validation.isValid).toBe(false);
    const c7Violations = validation.violations.filter((v) => v.type === 'C7_ADJACENT_BENCH_CONFLICT');
    expect(c7Violations.length).toBeGreaterThan(0);
    expect(c7Violations[0].message).toContain('adjacent benches');
    expect(c7Violations[0].message).toContain('CSE');
  });

  it('validateProposedSwap detects and blocks moves causing adjacent bench conflicts', () => {
    const candidates: ExamCandidate[] = [
      { id: 'c1', registerNumber: 'CS01', name: 'CS Student 1', branch: 'CSE', semester: '4', subjectCode: 'CS101' },
      { id: 'c2', registerNumber: 'CS02', name: 'CS Student 2', branch: 'CSE', semester: '4', subjectCode: 'CS102' },
    ];

    const room = createRoom(3, 3, 1);

    // Initial safe layout: (0,0) and (2,2) - not adjacent
    const initialAssignments = [
      { studentId: 'c1', candidateId: 'c1', roomId: room.id, row: 0, column: 0, seatIndex: 0 },
      { studentId: 'c2', candidateId: 'c2', roomId: room.id, row: 2, column: 2, seatIndex: 0 },
    ];

    // Propose moving c2 from (2,2) to (0,1) which is horizontally adjacent to c1 at (0,0)
    const swapCheck = validateProposedSwap(
      initialAssignments,
      candidates,
      [room],
      { roomId: room.id, row: 2, column: 2, seatIndex: 0 },
      { roomId: room.id, row: 0, column: 1, seatIndex: 0 },
      baseRules
    );

    expect(swapCheck.isValid).toBe(false);
    expect(swapCheck.blockingReasons.some((r) => r.includes('adjacent benches'))).toBe(true);
  });
});
