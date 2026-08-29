import type { AssignedSeat, SeatingArrangement, SeatingRules } from '../models/arrangement';
import type { Classroom } from '../models/classroom';
import type { Student } from '../models/student';
import { allocateStudentsToRooms } from './roomAllocation';
import { createSeedFromString } from './random';
import { optimizeSeatingAssignments } from './optimizer';
import { generateInitialSeating } from './seatingGenerator';
import { buildValidationReport } from './validator';

export type GenerationProgress = {
  stage: string;
  percent: number;
};

export type GenerationPipelineOptions = {
  students: Student[];
  classrooms: Classroom[];
  rules: SeatingRules;
  seed?: string;
  onProgress?: (progress: GenerationProgress) => void;
};

export async function runGenerationPipeline({
  students,
  classrooms,
  rules,
  seed = 'default-seed',
  onProgress,
}: GenerationPipelineOptions): Promise<{
  assignments: AssignedSeat[];
  validation: ReturnType<typeof buildValidationReport>;
}> {
  allocateStudentsToRooms(students, classrooms, createSeedFromString(seed));
  onProgress?.({ stage: 'Distributing students across classrooms...', percent: 25 });

  const initialAssignments = generateInitialSeating(students, classrooms, rules, seed);
  onProgress?.({ stage: 'Generating initial seat placements...', percent: 55 });

  const optimizedAssignments = optimizeSeatingAssignments(
    initialAssignments,
    students,
    classrooms,
    rules,
    80
  );
  onProgress?.({ stage: 'Optimizing branch separation and seat conflicts...', percent: 85 });

  const validation = buildValidationReport(optimizedAssignments, students, classrooms, rules);
  onProgress?.({ stage: 'Checking final seating conflicts...', percent: 100 });

  return {
    assignments: optimizedAssignments,
    validation,
  };
}

export function buildArrangementFromPipeline(
  pipeline: Awaited<ReturnType<typeof runGenerationPipeline>>,
  exam: SeatingArrangement['exam']
): SeatingArrangement {
  return {
    exam,
    classrooms: [],
    assignments: pipeline.assignments,
    generatedAt: new Date().toISOString(),
    generationSeed: 0,
    statistics: pipeline.validation.summary,
  };
}
