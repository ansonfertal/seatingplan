import type {
  AssignedSeat,
  ArrangementStatistics,
  SeatingArrangement,
  SeatingRules,
  UnassignedCandidate,
  ValidationReport,
} from '../models/arrangement';
import type { Classroom, Room } from '../models/classroom';
import type { ExamCandidate, Student } from '../models/student';
import { generateConstraintAwareSeating } from './seatingGenerator';
import { validateSeatingPlanIndependently } from './independentValidator';
import { analyzeAllocationInfeasibility, type InfeasibilityReport } from './infeasibilityAnalyzer';
import type { RoomFillStrategy } from './roomAllocation';

export type GenerationProgress = {
  stage: string;
  percent: number;
};

export type GenerationPipelineOptions = {
  students: (Student | ExamCandidate)[];
  classrooms: (Classroom | Room)[];
  rules: SeatingRules;
  seed?: string | number;
  strategy?: RoomFillStrategy;
  registerNumberOrder?: import('../models/arrangement').RegisterNumberOrder;
  examDate?: string;
  minimizeClassroomsUsed?: boolean;
  differentArrangementPerDate?: boolean;
  versionId?: string;
  onProgress?: (progress: GenerationProgress) => void;
};

export type GenerationPipelineResult = {
  assignments: AssignedSeat[];
  unassignedCandidates: UnassignedCandidate[];
  validation: ValidationReport;
  infeasibilityReport?: InfeasibilityReport;
  statistics: ArrangementStatistics;
  generationSeed: number;
  algorithmVersion: string;
};

export async function runGenerationPipeline({
  students,
  classrooms,
  rules,
  seed = 'default-seed',
  strategy = 'sequential',
  registerNumberOrder,
  examDate,
  minimizeClassroomsUsed,
  differentArrangementPerDate,
  versionId,
  onProgress,
}: GenerationPipelineOptions): Promise<GenerationPipelineResult> {
  onProgress?.({ stage: 'Initiating constraint-aware allocation engine...', percent: 5 });

  // Small delay to allow UI to render initial progress state
  await new Promise((resolve) => setTimeout(resolve, 30));

  // 1. Run deterministic allocator
  const generationOutput = generateConstraintAwareSeating(students, classrooms, rules, {
    seed,
    strategy,
    registerNumberOrder: registerNumberOrder ?? rules.registerNumberOrder,
    examDate,
    minimizeClassroomsUsed: minimizeClassroomsUsed ?? rules.minimizeClassroomsUsed,
    differentArrangementPerDate: differentArrangementPerDate ?? rules.differentArrangementPerDate,
    versionId,
    onProgress,
  });

  onProgress?.({ stage: 'Running independent decoupled validator (Constraints C1–C5)...', percent: 85 });
  await new Promise((resolve) => setTimeout(resolve, 20));

  // 2. Run independent validator decoupled from generator
  const independentResult = validateSeatingPlanIndependently(
    generationOutput.assignments,
    students,
    classrooms
  );

  const validationReport = independentResult.asValidationReport();

  // 3. Analyze infeasibility if unassigned candidates exist or validation failed
  let infeasibilityReport: InfeasibilityReport | undefined;
  if (generationOutput.unassignedCandidates.length > 0 || !independentResult.isValid) {
    infeasibilityReport = analyzeAllocationInfeasibility(
      students,
      classrooms,
      generationOutput.unassignedCandidates
    );
  }

  onProgress?.({ stage: 'Seating generation & independent validation verified.', percent: 100 });

  return {
    assignments: generationOutput.assignments,
    unassignedCandidates: generationOutput.unassignedCandidates,
    validation: validationReport,
    infeasibilityReport,
    statistics: independentResult.summary,
    generationSeed: generationOutput.generationSeed,
    algorithmVersion: generationOutput.algorithmVersion,
  };
}

export function buildArrangementFromPipeline(
  pipeline: GenerationPipelineResult,
  exam: SeatingArrangement['exam'],
  classrooms: (Classroom | Room)[]
): SeatingArrangement {
  return {
    exam,
    classrooms,
    assignments: pipeline.assignments,
    generatedAt: new Date().toISOString(),
    generationSeed: pipeline.generationSeed,
    statistics: pipeline.statistics,
  };
}
