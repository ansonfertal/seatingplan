import type { ExamCandidate, Student, StudentImportRaw } from '../models/student';
import { clearDraft } from '../storage/draftStorage';

/**
 * Characters that trigger spreadsheet formula execution when opened in Excel/Calc/Sheets.
 */
const FORMULA_INJECTION_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Checks if a string starts with a formula injection trigger.
 */
export function isPotentialFormulaInjection(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith('\t') || value.startsWith('\r')) return true;
  const trimmed = value.trim();
  return FORMULA_INJECTION_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

/**
 * Strips leading formula injection trigger characters (=, +, -, @, tabs, \r) from a cell string.
 * Preserves leading zeroes (e.g. '00123' remains '00123').
 */
export function stripFormulaInjection(value: string): string {
  if (!value || typeof value !== 'string') return '';
  let cleaned = value.replace(/^[\t\r]+/, '').trim();
  while (cleaned.length > 0 && FORMULA_INJECTION_PREFIXES.includes(cleaned[0])) {
    cleaned = cleaned.slice(1).replace(/^[\t\r]+/, '').trim();
  }
  return cleaned;
}

/**
 * Sanitizes an individual cell input by stripping formula injection characters and trimming whitespace.
 */
export function sanitizeCellInput(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return stripFormulaInjection(str);
}

/**
 * Sanitizes all string fields in a raw imported row object.
 */
export function sanitizeRawImportRow(row: StudentImportRaw): StudentImportRaw {
  const sanitized: StudentImportRaw = {};
  for (const [key, val] of Object.entries(row)) {
    const cleanKey = stripFormulaInjection(key);
    sanitized[cleanKey] = sanitizeCellInput(val);
  }
  return sanitized;
}

/**
 * Redacts a candidate's register number and personal name for safe logging.
 * Prevents plain-text PII leakage to the browser console.
 */
export function redactCandidateForLog(candidate: Partial<ExamCandidate | Student>): Record<string, unknown> {
  const regNo = candidate.registerNumber ? String(candidate.registerNumber) : '';
  const name = candidate.name ? String(candidate.name) : '';

  let redactedRegNo = '***';
  if (regNo.length > 4) {
    redactedRegNo = `${regNo.slice(0, 2)}***${regNo.slice(-2)}`;
  } else if (regNo.length > 0) {
    redactedRegNo = `${regNo[0]}***`;
  }

  const redactedName = name
    .split(/\s+/)
    .map((word) => (word.length > 1 ? `${word[0]}***` : '*'))
    .join(' ');

  return {
    ...candidate,
    registerNumber: redactedRegNo,
    name: redactedName,
  };
}

/**
 * Safe console logger that masks student PII before writing to console.
 */
export const safeLogger = {
  log: (message: string, ...args: unknown[]): void => {
    const sanitizedArgs = args.map((arg) => {
      if (arg && typeof arg === 'object') {
        if (Array.isArray(arg)) {
          return arg.map((item) =>
            item && typeof item === 'object' && ('registerNumber' in item || 'name' in item)
              ? redactCandidateForLog(item)
              : item
          );
        }
        if ('registerNumber' in arg || 'name' in arg) {
          return redactCandidateForLog(arg as Partial<ExamCandidate>);
        }
      }
      return arg;
    });
    console.log(`[SafeLog] ${message}`, ...sanitizedArgs);
  },
  warn: (message: string, ...args: unknown[]): void => {
    const sanitizedArgs = args.map((arg) => {
      if (arg && typeof arg === 'object' && ('registerNumber' in arg || 'name' in arg)) {
        return redactCandidateForLog(arg as Partial<ExamCandidate>);
      }
      return arg;
    });
    console.warn(`[SafeWarn] ${message}`, ...sanitizedArgs);
  },
};

/**
 * Hard privacy wipe action: clears all candidate records, allocations, and active versions
 * from memory and local storage drafts without destroying room templates or exam shell.
 */
export function clearAllStudentDataAction(storeSetState?: (updater: any) => void): void {
  // Clear persistent draft storage
  clearDraft();

  // If zustand updater is provided
  if (storeSetState) {
    storeSetState({
      students: [],
      arrangement: undefined,
      allocationVersions: [],
      activeVersionId: undefined,
      validation: undefined,
    });
  }
}
