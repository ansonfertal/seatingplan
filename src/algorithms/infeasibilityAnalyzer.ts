import type { Classroom, Room } from '../models/classroom';
import { calculateEffectiveCapacity } from '../models/classroom';
import type { ExamCandidate, Student } from '../models/student';
import { normalizeCode } from '../models/student';
import type { UnassignedCandidate } from '../models/arrangement';

export type InfeasibilityDiagnosisType =
  | 'CAPACITY_SHORTAGE'
  | 'PIGEONHOLE_SUBJECT_DOMINANCE'
  | 'PIGEONHOLE_BRANCH_SEMESTER_DOMINANCE'
  | 'BENCH_COMPANION_ISOLATION'
  | 'FEASIBLE';

export type ActionableRecommendation = {
  title: string;
  description: string;
  actionType: 'add_rooms' | 'change_bench_occupancy' | 'inspect_data' | 'rebalance';
};

export type InfeasibilityReport = {
  diagnosisType: InfeasibilityDiagnosisType;
  title: string;
  explanation: string;
  unassignedCount: number;
  unassignedCandidates: UnassignedCandidate[];
  recommendations: ActionableRecommendation[];
};

/**
 * Mathematical infeasibility analyzer (PRD Section 4.5).
 * Distinguishes capacity shortages from pigeonhole impossibility and bench companion conflicts.
 */
export function analyzeAllocationInfeasibility(
  students: (Student | ExamCandidate)[],
  classrooms: (Classroom | Room)[],
  unassigned: UnassignedCandidate[]
): InfeasibilityReport {
  const activeRooms = classrooms.filter((r) => r.active !== false);
  const totalCapacity = activeRooms.reduce((sum, r) => sum + calculateEffectiveCapacity(r), 0);
  const totalStudents = students.length;

  // 1. Capacity Shortage
  if (totalStudents > totalCapacity) {
    const deficit = totalStudents - totalCapacity;
    return {
      diagnosisType: 'CAPACITY_SHORTAGE',
      title: 'Physical Seating Shortage',
      explanation: `Total eligible candidate count (${totalStudents}) exceeds active rooms' effective capacity (${totalCapacity}) by ${deficit} seat(s).`,
      unassignedCount: unassigned.length,
      unassignedCandidates: unassigned,
      recommendations: [
        {
          title: 'Activate Additional Rooms',
          description: `Select or add more examination halls with at least ${deficit} additional seats.`,
          actionType: 'add_rooms',
        },
        {
          title: 'Unblock Obstructions',
          description: 'Review blocked benches and disabled seats in existing classrooms to free up usable capacity.',
          actionType: 'inspect_data',
        },
      ],
    };
  }

  // 2. Pigeonhole Subject Dominance
  // On a 2-person bench, max candidates from same subject in a room is <= totalBenches
  // (i.e. <= 50% of seats in 2-student bench rooms).
  const subjectCounts = new Map<string, number>();
  students.forEach((s) => {
    const code = normalizeCode(s.subjectCode) || 'UNSPECIFIED';
    subjectCounts.set(code, (subjectCounts.get(code) || 0) + 1);
  });

  const avgStudentsPerBench =
    activeRooms.reduce((sum, r) => sum + r.studentsPerBench * calculateEffectiveCapacity(r), 0) /
    Math.max(1, totalCapacity);

  for (const [subject, count] of subjectCounts.entries()) {
    // If a subject represents > 50% of candidates in rooms with 2-person benches
    const maxTheoreticalLimit = totalCapacity / Math.max(1, avgStudentsPerBench);
    if (avgStudentsPerBench >= 2 && count > maxTheoreticalLimit) {
      return {
        diagnosisType: 'PIGEONHOLE_SUBJECT_DOMINANCE',
        title: `Subject Code Concentration (${subject})`,
        explanation: `Candidates for subject "${subject}" (${count} students) exceed the maximum compatible bench slots (${Math.floor(maxTheoreticalLimit)}). By Constraint C2, no two candidates sharing subject code "${subject}" may sit on the same bench.`,
        unassignedCount: unassigned.length,
        unassignedCandidates: unassigned,
        recommendations: [
          {
            title: 'Configure 1 Student per Bench (Single Occupancy)',
            description: `Set rooms hosting subject "${subject}" to 1 student per bench to eliminate same-bench subject conflicts entirely.`,
            actionType: 'change_bench_occupancy',
          },
          {
            title: 'Add More Multi-Subject Rooms',
            description: 'Incorporate candidates from other exams/subjects into the same session to provide compatible bench companions.',
            actionType: 'rebalance',
          },
        ],
      };
    }
  }

  // 3. Pigeonhole Branch + Semester Dominance
  const branchSemCounts = new Map<string, number>();
  students.forEach((s) => {
    const key = `${normalizeCode(s.branch)}|${normalizeCode(s.semester)}`;
    branchSemCounts.set(key, (branchSemCounts.get(key) || 0) + 1);
  });

  for (const [branchSem, count] of branchSemCounts.entries()) {
    const maxTheoreticalLimit = totalCapacity / Math.max(1, avgStudentsPerBench);
    if (avgStudentsPerBench >= 2 && count > maxTheoreticalLimit) {
      const [branch, sem] = branchSem.split('|');
      return {
        diagnosisType: 'PIGEONHOLE_BRANCH_SEMESTER_DOMINANCE',
        title: `Branch & Semester Concentration (${branch} ${sem})`,
        explanation: `Candidates from ${branch} semester ${sem} (${count} students) exceed compatible bench limit (${Math.floor(maxTheoreticalLimit)}). By Constraint C3, they cannot occupy the same bench.`,
        unassignedCount: unassigned.length,
        unassignedCandidates: unassigned,
        recommendations: [
          {
            title: 'Switch to Single Occupancy Benches',
            description: 'Change rooms to 1 student per bench to allow all students from this branch to be accommodated.',
            actionType: 'change_bench_occupancy',
          },
          {
            title: 'Add Classrooms',
            description: 'Introduce extra classrooms to spread out the single-cohort concentration.',
            actionType: 'add_rooms',
          },
        ],
      };
    }
  }

  // 4. Bench Companion Isolation (if unassigned exists)
  if (unassigned.length > 0) {
    return {
      diagnosisType: 'BENCH_COMPANION_ISOLATION',
      title: 'Bench Companion Incompatibility',
      explanation: `${unassigned.length} candidate(s) could not be seated because remaining available bench slots only had occupants from the same subject code (C2) or same branch/semester (C3).`,
      unassignedCount: unassigned.length,
      unassignedCandidates: unassigned,
      recommendations: [
        {
          title: 'Add an Additional Room',
          description: 'Adding a room provides fresh empty benches where candidates can be placed without conflicting companions.',
          actionType: 'add_rooms',
        },
        {
          title: 'Regenerate with Alternative Seed or Strategy',
          description: 'Try regenerating with a different seed or switching room strategy to "Balanced Distribution" to reorder placements.',
          actionType: 'rebalance',
        },
      ],
    };
  }

  return {
    diagnosisType: 'FEASIBLE',
    title: 'Seating Allocation Fully Feasible',
    explanation: 'All candidates placed into valid physical seats with zero constraint violations.',
    unassignedCount: 0,
    unassignedCandidates: [],
    recommendations: [],
  };
}
