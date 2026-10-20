/**
 * ExamCandidate domain model conforming to PRD Section 5.
 * Register numbers are strictly treated as strings to preserve leading zeros.
 */
export type ExamCandidate = {
  id: string;
  examId?: string;
  registerNumber: string;
  name: string;
  branch: string;
  semester?: string;
  subjectCode?: string;
  sourceRow?: number;
  section?: string;
  department?: string;
};

/** Backward-compatible alias for ExamCandidate */
export type Student = ExamCandidate;

export type BranchInfo = {
  branch: string;
  count: number;
};

export type StudentImportRaw = Record<string, string | number>;

/**
 * Normalizes branch, semester, or subject code for constraint comparison
 * while preserving original display text.
 */
export function normalizeCode(value?: string | number): string {
  if (value === undefined || value === null) return '';
  return String(value).trim().toUpperCase().replace(/\s+/g, '');
}
