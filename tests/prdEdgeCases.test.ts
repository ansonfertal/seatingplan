import { describe, expect, it } from 'vitest';
import type { Room, SeatPosition } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { SeatingRules } from '../src/models/arrangement';
import { generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';
import { validateSeatingCapacity } from '../src/algorithms/capacityValidator';
import { validateStudentData } from '../src/import/studentValidator';
import { buildAllocationExportRows } from '../src/export/csvAllocationExporter';

describe('TASK-6.2: Comprehensive PRD Edge Case Verification Suite', () => {
  const strictRules: SeatingRules = {
    sameBenchSeparation: true,
    horizontalAdjacency: false,
    verticalAdjacency: false,
    diagonalAdjacency: false,
    sameSemesterSeparation: true,
    sameSubjectCodeSeparation: true,
  };

  const createRoom = (
    id: string,
    name: string,
    rows: number,
    cols: number,
    studentsPerBench: 1 | 2 | 3,
    disabledSeats: SeatPosition[] = []
  ): Room => {
    const theoretical = rows * cols * studentsPerBench;
    return {
      id,
      name,
      rows,
      columns: cols,
      studentsPerBench,
      capacity: theoretical - disabledSeats.length,
      usableCapacity: theoretical - disabledSeats.length,
      disabledSeats,
      active: true,
      roomOrder: 1,
    };
  };

  // Edge Case 1: Single-branch candidate pool in multi-student bench rooms
  it('Edge Case 1: handles single-branch candidate pool without silent C2/C3 violations', () => {
    // 20 students all from CSE (same branch, same subject)
    const singleBranchStudents: ExamCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      id: `s-${i + 1}`,
      registerNumber: `CS2026_${String(i + 1).padStart(3, '0')}`,
      name: `CSE Student ${i + 1}`,
      branch: 'CSE',
      semester: '4',
      subjectCode: 'CS401',
    }));

    // Room with 10 benches, 2 students per bench (theoretical capacity 20)
    // Under C2/C3, each bench can hold AT MOST 1 CSE student because no companion cohort exists.
    const room = createRoom('r-1', 'Hall 101', 5, 2, 2);

    const result = generateConstraintAwareSeating(singleBranchStudents, [room], strictRules, {
      seed: 42,
    });

    // Independent validator must verify that NO bench contains two students from CSE
    const validation = validateSeatingPlanIndependently(result.assignments, singleBranchStudents, [room]);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);

    // Because each bench can hold at most 1 CSE student, exactly 10 students can be seated, and 10 remain unassigned
    expect(result.assignments.length).toBe(10);
    expect(result.unassignedCandidates.length).toBe(10);

    // Verify bench occupants: each bench row/col combination has at most 1 student
    const benchMap = new Map<string, number>();
    for (const a of result.assignments) {
      const benchKey = `${a.roomId || a.classroomId}_${a.row}_${a.column}`;
      benchMap.set(benchKey, (benchMap.get(benchKey) || 0) + 1);
    }
    for (const count of benchMap.values()) {
      expect(count).toBe(1); // Never 2!
    }
  });

  // Edge Case 2: Concentrated subject codes (>50% same subject)
  it('Edge Case 2: enforces pigeonhole principle when >50% candidates share same subject', () => {
    // 30 candidates: 20 from CS401 (CSE), 10 from EC401 (ECE)
    const csStudents: ExamCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      id: `cs-${i + 1}`,
      registerNumber: `CS_${i + 1}`,
      name: `CS Student ${i + 1}`,
      branch: 'CSE',
      semester: '4',
      subjectCode: 'CS401',
    }));

    const ecStudents: ExamCandidate[] = Array.from({ length: 10 }, (_, i) => ({
      id: `ec-${i + 1}`,
      registerNumber: `EC_${i + 1}`,
      name: `EC Student ${i + 1}`,
      branch: 'ECE',
      semester: '4',
      subjectCode: 'EC401',
    }));

    const allStudents = [...csStudents, ...ecStudents];

    // Room with 15 benches of 2 seats = 30 seats
    const room = createRoom('r-dominant', 'Hall 201', 5, 3, 2);

    const result = generateConstraintAwareSeating(allStudents, [room], strictRules, { seed: 101 });

    // Validate independently
    const validation = validateSeatingPlanIndependently(result.assignments, allStudents, [room]);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);

    // Since only 10 EC students exist to pair with CS students on 2-seat benches,
    // at most 10 benches can have 2 students (10 CS + 10 EC = 20),
    // and the remaining 5 benches can each seat at most 1 CS student (5 CS).
    // Total seated = 25. 5 CS students cannot be paired and are safely reported as unassigned.
    expect(result.assignments.length).toBe(25);
    expect(result.unassignedCandidates.length).toBe(5);
  });

  // Edge Case 3: Leading zeros in register numbers (e.g. 00123)
  it('Edge Case 3: preserves leading zeros in register numbers across validation, allocation, and export', () => {
    const rawData = [
      { reg: '00123', name: 'Alice Zero', branch: 'CSE', sem: '3', sub: 'CS301' },
      { reg: '00007', name: 'James Bond', branch: 'ECE', sem: '3', sub: 'EC301' },
      { reg: '04200', name: 'Charlie Mid', branch: 'CSE', sem: '3', sub: 'CS301' },
    ];

    const report = validateStudentData(rawData, {
      registerNumber: 'reg',
      name: 'name',
      branch: 'branch',
      semester: 'sem',
      subjectCode: 'sub',
    });

    expect(report.validStudents).toHaveLength(3);
    expect(report.validStudents[0].registerNumber).toBe('00123');
    expect(report.validStudents[1].registerNumber).toBe('00007');
    expect(report.validStudents[2].registerNumber).toBe('04200');

    // Run allocation
    const room = createRoom('r-zeros', 'Hall 301', 2, 2, 2);
    const result = generateConstraintAwareSeating(report.validStudents, [room], strictRules);

    expect(result.assignments).toHaveLength(3);

    // Export rows
    const exportRows = buildAllocationExportRows(
      { examName: 'Midterm', examDate: '2026-10-20' } as any,
      [room],
      result.assignments,
      report.validStudents
    );

    const exportedRegs = exportRows.map((r) => r['Register Number']);
    expect(exportedRegs).toContain('00123');
    expect(exportedRegs).toContain('00007');
    expect(exportedRegs).toContain('04200');
  });

  // Edge Case 4: All-blocked seats or insufficient capacity
  it('Edge Case 4: handles all-blocked seats and insufficient capacity gracefully', () => {
    // 2x2 room with 1 student per bench = 4 seats, but all 4 seats are blocked
    const blockedPositions: SeatPosition[] = [
      { row: 0, column: 0, seatIndex: 0 },
      { row: 0, column: 1, seatIndex: 0 },
      { row: 1, column: 0, seatIndex: 0 },
      { row: 1, column: 1, seatIndex: 0 },
    ];
    const allBlockedRoom = createRoom('r-blocked', 'Broken Hall', 2, 2, 1, blockedPositions);

    expect(allBlockedRoom.usableCapacity).toBe(0);

    const candidates: ExamCandidate[] = [
      {
        id: 's-1',
        registerNumber: 'CS01',
        name: 'Solitary Student',
        branch: 'CSE',
        semester: '1',
        subjectCode: 'CS101',
      },
    ];

    // Capacity validator pre-check
    const capCheck = validateSeatingCapacity([allBlockedRoom], candidates);
    expect(capCheck.status).toBe('INSUFFICIENT');
    expect(capCheck.totalAvailableSeats).toBe(0);
    expect(capCheck.shortageCount).toBe(1);

    // Allocator must not crash and cleanly report candidate as unassigned
    const result = generateConstraintAwareSeating(candidates, [allBlockedRoom], strictRules);
    expect(result.assignments).toHaveLength(0);
    expect(result.unassignedCandidates).toHaveLength(1);
    expect(result.unassignedCandidates[0].registerNumber).toBe('CS01');
  });

  // Edge Case 5: Odd candidate numbers with partially occupied final bench
  it('Edge Case 5: allocates odd candidate numbers with cleanly occupied final bench', () => {
    // 7 candidates (odd count) across 2 branches
    const csStudents: ExamCandidate[] = Array.from({ length: 4 }, (_, i) => ({
      id: `cs-${i + 1}`,
      registerNumber: `CS_${i + 1}`,
      name: `CS Student ${i + 1}`,
      branch: 'CSE',
      semester: '2',
      subjectCode: 'CS201',
    }));
    const ecStudents: ExamCandidate[] = Array.from({ length: 3 }, (_, i) => ({
      id: `ec-${i + 1}`,
      registerNumber: `EC_${i + 1}`,
      name: `EC Student ${i + 1}`,
      branch: 'ECE',
      semester: '2',
      subjectCode: 'EC201',
    }));

    const students = [...csStudents, ...ecStudents]; // total 7

    // Room: 4 benches of 2 seats = 8 seats
    const room = createRoom('r-odd', 'Hall Odd', 2, 2, 2);

    const result = generateConstraintAwareSeating(students, [room], strictRules);

    expect(result.assignments).toHaveLength(7);
    expect(result.unassignedCandidates).toHaveLength(0);

    // Independent validator confirms zero violations
    const validation = validateSeatingPlanIndependently(result.assignments, students, [room]);
    expect(validation.isValid).toBe(true);
    expect(validation.violations).toHaveLength(0);

    // Find the bench with 1 occupant
    const benchOccupants = new Map<string, number>();
    for (const a of result.assignments) {
      const key = `${a.row}_${a.column}`;
      benchOccupants.set(key, (benchOccupants.get(key) || 0) + 1);
    }

    const counts = Array.from(benchOccupants.values()).sort();
    expect(counts).toEqual([1, 2, 2, 2]); // 3 benches of 2, 1 bench of 1
  });

  // Edge Case 6: Candidate with missing semester or subject code
  it('Edge Case 6: rejects candidates with missing mandatory fields at pre-check / import', () => {
    const rawWithMissingFields = [
      { reg: 'CS101', name: 'Valid Student', branch: 'CSE', sem: '4', sub: 'CS401' },
      { reg: 'CS102', name: 'No Semester', branch: 'CSE', sem: '', sub: 'CS401' },
      { reg: 'CS103', name: 'No Subject', branch: 'CSE', sem: '4', sub: '' },
      { reg: '', name: 'No RegNo', branch: 'CSE', sem: '4', sub: 'CS401' },
    ];

    const report = validateStudentData(rawWithMissingFields, {
      registerNumber: 'reg',
      name: 'name',
      branch: 'branch',
      semester: 'sem',
      subjectCode: 'sub',
    });

    expect(report.validStudents).toHaveLength(1);
    expect(report.invalidRows).toHaveLength(3);

    const issueMessages = report.invalidRows.flatMap((r) => r.issues);
    expect(issueMessages).toContain('Missing Semester');
    expect(issueMessages).toContain('Missing Subject Code');
    expect(issueMessages).toContain('Missing Register Number');
  });

  // Edge Case 7: Long candidate names (50+ characters)
  it('Edge Case 7: processes candidates with 50+ character names without corruption or truncation', () => {
    const ultraLongName = 'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff The Third of Canterbury High';
    expect(ultraLongName.length).toBeGreaterThan(50);

    const candidates: ExamCandidate[] = [
      {
        id: 'long-1',
        registerNumber: 'LONG_001',
        name: ultraLongName,
        branch: 'Computer Science & Engineering (Cybersecurity)',
        semester: '7',
        subjectCode: 'CS799_ADV_CRYPTOGRAPHY',
      },
      {
        id: 'long-2',
        registerNumber: 'LONG_002',
        name: 'Short Name',
        branch: 'ECE',
        semester: '7',
        subjectCode: 'EC701',
      },
    ];

    const room = createRoom('r-long', 'Auditorium', 2, 2, 2);
    const result = generateConstraintAwareSeating(candidates, [room], strictRules);

    expect(result.assignments).toHaveLength(2);

    const exportRows = buildAllocationExportRows(
      { examName: 'Senior Exams', examDate: '2026-11-01' } as any,
      [room],
      result.assignments,
      candidates
    );

    const exportedNames = exportRows.map((r) => r['Candidate Name']);
    expect(exportedNames).toContain(ultraLongName);
  });
});
