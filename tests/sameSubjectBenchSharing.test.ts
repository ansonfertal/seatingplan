import { describe, expect, it } from 'vitest';
import type { Classroom } from '../src/models/classroom';
import type { ExamCandidate } from '../src/models/student';
import type { SeatingRules } from '../src/models/arrangement';
import { checkBenchConflict, generateConstraintAwareSeating } from '../src/algorithms/seatingGenerator';
import { validateSeatingPlanIndependently } from '../src/algorithms/independentValidator';
import { validateArrangementConflicts } from '../src/algorithms/validator';
import { analyzeAllocationInfeasibility } from '../src/algorithms/infeasibilityAnalyzer';

describe('Same Subject Code Bench Sharing Feature', () => {
  const createRoom = (
    id: string,
    name: string,
    rows: number,
    columns: number,
    benchCapacity = 2
  ): Classroom => ({
    id,
    name,
    rows,
    columns,
    studentsPerBench: benchCapacity,
    benchCapacity,
    usableCapacity: rows * columns * benchCapacity,
    active: true,
    roomOrder: 1,
  });

  const candA: ExamCandidate = {
    id: 's-1',
    registerNumber: 'ME101',
    name: 'Student ME',
    branch: 'ME',
    semester: 'S3',
    subjectCode: 'MATH101',
  };

  const candB: ExamCandidate = {
    id: 's-2',
    registerNumber: 'CE101',
    name: 'Student CE',
    branch: 'CE',
    semester: 'S3',
    subjectCode: 'MATH101', // Same subject, different branch!
  };

  describe('checkBenchConflict unit behavior', () => {
    it('blocks same subject code on same bench when sameSubjectCodeSeparation is true (default)', () => {
      const checkDefault = checkBenchConflict(candA, [candB]);
      expect(checkDefault.hasConflict).toBe(true);
      expect(checkDefault.reason).toBe('subject');

      const checkExplicit = checkBenchConflict(candA, [candB], {
        sameBenchSeparation: true,
        horizontalAdjacency: true,
        verticalAdjacency: true,
        diagonalAdjacency: false,
        sameSemesterSeparation: true,
        sameSubjectCodeSeparation: true,
      });
      expect(checkExplicit.hasConflict).toBe(true);
      expect(checkExplicit.reason).toBe('subject');
    });

    it('permits same subject code on same bench when sameSubjectCodeSeparation is false', () => {
      const check = checkBenchConflict(candA, [candB], {
        sameBenchSeparation: true,
        horizontalAdjacency: true,
        verticalAdjacency: true,
        diagonalAdjacency: false,
        sameSemesterSeparation: true,
        sameSubjectCodeSeparation: false,
      });
      expect(check.hasConflict).toBe(false);
    });

    it('permits same subject code on same bench when sameBenchSubjectSeparation is explicitly false', () => {
      const check = checkBenchConflict(candA, [candB], {
        sameBenchSeparation: true,
        horizontalAdjacency: true,
        verticalAdjacency: true,
        diagonalAdjacency: false,
        sameSemesterSeparation: true,
        sameSubjectCodeSeparation: true,
        sameBenchSubjectSeparation: false,
      });
      expect(check.hasConflict).toBe(false);
    });
  });

  describe('Seating generation & independent validation with same subject code on same bench', () => {
    it('successfully seats same-subject candidates on the same 2-person bench when sameSubjectCodeSeparation is false', () => {
      // 10 ME students and 10 CE students all taking MATH101
      // In a room with 10 benches (2 seats per bench = 20 seats)
      // When sameSubjectCodeSeparation is false, all 20 must be seated (2 per bench: 1 ME + 1 CE)
      const students: ExamCandidate[] = [
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `me-${i + 1}`,
          registerNumber: `ME${100 + i}`,
          name: `ME Student ${i + 1}`,
          branch: 'ME',
          semester: 'S3',
          subjectCode: 'MATH101',
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `ce-${i + 1}`,
          registerNumber: `CE${100 + i}`,
          name: `CE Student ${i + 1}`,
          branch: 'CE',
          semester: 'S3',
          subjectCode: 'MATH101',
        })),
      ];

      const room = createRoom('hall-1', 'Hall 1', 5, 2, 2); // 10 benches = 20 seats

      const rules: SeatingRules = {
        sameBenchSeparation: true,
        horizontalAdjacency: true,
        verticalAdjacency: true,
        diagonalAdjacency: false,
        sameSemesterSeparation: true,
        sameSubjectCodeSeparation: false, // Disabling same subject code separation!
      };

      const result = generateConstraintAwareSeating(students, [room], rules);

      // All 20 students must be seated with 0 unassigned
      expect(result.unassignedCandidates).toHaveLength(0);
      expect(result.assignments).toHaveLength(20);

      // Verify each bench holds 2 students
      const benches = new Map<string, typeof result.assignments>();
      for (const a of result.assignments) {
        const key = `${a.row}-${a.column}`;
        const list = benches.get(key) || [];
        list.push(a);
        benches.set(key, list);
      }
      expect(benches.size).toBe(10);
      for (const [, occupants] of benches) {
        expect(occupants).toHaveLength(2);
      }

      // Independent decoupled validator verifies 0 violations and Valid status
      const validation = validateSeatingPlanIndependently(
        result.assignments,
        students,
        [room],
        rules
      );
      expect(validation.isValid).toBe(true);
      expect(validation.status).toBe('Valid');
      expect(validation.violations).toHaveLength(0);

      // validator.validateArrangementConflicts also reports 0 conflicts
      const conflicts = validateArrangementConflicts(result.assignments, [room], students, rules);
      expect(conflicts).toHaveLength(0);
    });

    it('infeasibility analyzer does NOT report pigeonhole subject dominance when sameSubjectCodeSeparation is false', () => {
      const students: ExamCandidate[] = Array.from({ length: 20 }, (_, i) => ({
        id: `s-${i + 1}`,
        registerNumber: `REG${100 + i}`,
        name: `Student ${i + 1}`,
        branch: i % 2 === 0 ? 'ME' : 'CE',
        semester: 'S3',
        subjectCode: 'MATH101',
      }));

      const room = createRoom('hall-1', 'Hall 1', 5, 2, 2);

      const rules: SeatingRules = {
        sameBenchSeparation: true,
        horizontalAdjacency: true,
        verticalAdjacency: true,
        diagonalAdjacency: false,
        sameSemesterSeparation: true,
        sameSubjectCodeSeparation: false,
      };

      const report = analyzeAllocationInfeasibility(students, [room], [], rules);
      expect(report.diagnosisType).not.toBe('PIGEONHOLE_SUBJECT_DOMINANCE');
    });

    it('permits same branch AND same subject when both sameBenchSeparation and sameSubjectCodeSeparation are false', () => {
      // 20 students all from CSE taking CS301
      const students: ExamCandidate[] = Array.from({ length: 20 }, (_, i) => ({
        id: `cs-${i + 1}`,
        registerNumber: `CS${100 + i}`,
        name: `CS Student ${i + 1}`,
        branch: 'CSE',
        semester: 'S5',
        subjectCode: 'CS301',
      }));

      const room = createRoom('hall-1', 'Hall 1', 5, 2, 2); // 10 benches = 20 seats

      const rules: SeatingRules = {
        sameBenchSeparation: false, // User allows same branch on bench
        horizontalAdjacency: false,
        verticalAdjacency: false,
        diagonalAdjacency: false,
        sameSemesterSeparation: false,
        sameSubjectCodeSeparation: false, // User allows same subject on bench
      };

      const result = generateConstraintAwareSeating(students, [room], rules);
      expect(result.unassignedCandidates).toHaveLength(0);
      expect(result.assignments).toHaveLength(20);

      const validation = validateSeatingPlanIndependently(
        result.assignments,
        students,
        [room],
        rules
      );
      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });
  });
});
