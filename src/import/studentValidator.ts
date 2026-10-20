import type { ExamCandidate, Student, StudentImportRaw } from '../models/student';
import { sanitizeCellInput } from '../utils/securitySanitizer';

export type DuplicatePolicy = 'reject' | 'keepFirst' | 'overwrite';

export type ValidationIssue = {
  rowIndex: number;
  message: string;
};

export type InvalidRecord = {
  rowIndex: number;
  row: StudentImportRaw;
  issues: string[];
};

export type ValidationReport = {
  validStudents: ExamCandidate[];
  invalidRows: InvalidRecord[];
  duplicateCount: number;
  missingBranchCount: number;
  missingSemesterCount: number;
  missingSubjectCount: number;
  duplicatePolicy: DuplicatePolicy;
};

export type ColumnMapping = {
  registerNumber: string;
  name: string;
  branch: string;
  semester?: string;
  subjectCode?: string;
  defaultSemester?: string;
  defaultSubjectCode?: string;
};

/**
 * Validates candidate records against PRD Section 4.2 & 4.4 constraints:
 * - Register number (string, never numeric, preserves leading zeros)
 * - Candidate name (required)
 * - Branch (required)
 * - Semester (required)
 * - Subject Code (required)
 * - Uniqueness (duplicate register number policy: reject, keepFirst, overwrite)
 */
export function validateStudentData(
  rawData: StudentImportRaw[],
  mapping: ColumnMapping,
  existingStudents: (Student | ExamCandidate)[] = [],
  duplicatePolicy: DuplicatePolicy = 'reject'
): ValidationReport {
  const validStudentsMap = new Map<string, ExamCandidate>();
  const invalidRows: InvalidRecord[] = [];

  let duplicateCount = 0;
  let missingBranchCount = 0;
  let missingSemesterCount = 0;
  let missingSubjectCount = 0;

  // Track existing register numbers
  const existingRegisterNumbers = new Set(
    existingStudents.map((s) => s.registerNumber.trim().toLowerCase())
  );

  rawData.forEach((row, index) => {
    const rowIndex = index + 1; // 1-based index matching spreadsheet rows
    const issues: string[] = [];

    // 1. Extract values
    const regNoRaw = row[mapping.registerNumber];
    const nameRaw = row[mapping.name];
    const branchRaw = row[mapping.branch];
    const semesterRaw = mapping.semester ? row[mapping.semester] : mapping.defaultSemester;
    const subjectCodeRaw = mapping.subjectCode ? row[mapping.subjectCode] : mapping.defaultSubjectCode;

    // Preserve exact raw string for register number (never numeric cast), sanitize against formula injection
    const registerNumber = sanitizeCellInput(regNoRaw);
    const name = sanitizeCellInput(nameRaw);
    const branchDisplay = sanitizeCellInput(branchRaw);
    const semesterDisplay = sanitizeCellInput(semesterRaw ?? mapping.defaultSemester ?? '');
    const subjectCodeDisplay = sanitizeCellInput(subjectCodeRaw ?? mapping.defaultSubjectCode ?? '');

    // 2. Mandatory field validations
    if (!registerNumber) {
      issues.push('Missing Register Number');
    }

    if (!name) {
      issues.push('Missing Candidate Name');
    }

    if (!branchDisplay) {
      issues.push('Missing Branch');
      missingBranchCount++;
    }

    if (mapping.semester && !semesterDisplay) {
      issues.push('Missing Semester');
      missingSemesterCount++;
    }

    if (mapping.subjectCode && !subjectCodeDisplay) {
      issues.push('Missing Subject Code');
      missingSubjectCount++;
    }

    // 3. Duplicate detection & policy enforcement
    if (registerNumber) {
      const regKey = registerNumber.toLowerCase();
      const isDuplicateInExisting = existingRegisterNumbers.has(regKey);
      const isDuplicateInBatch = validStudentsMap.has(regKey);

      if (isDuplicateInExisting || isDuplicateInBatch) {
        duplicateCount++;

        if (duplicatePolicy === 'reject') {
          issues.push(`Duplicate Register Number: ${registerNumber}`);
        } else if (duplicatePolicy === 'keepFirst') {
          // Skip subsequent duplicate without adding to invalid issues list
          return;
        } else if (duplicatePolicy === 'overwrite') {
          // Overwrite earlier entry in batch
          if (isDuplicateInBatch && issues.length === 0) {
            validStudentsMap.set(regKey, {
              id: validStudentsMap.get(regKey)!.id,
              registerNumber,
              name,
              branch: branchDisplay,
              semester: semesterDisplay,
              subjectCode: subjectCodeDisplay,
              sourceRow: rowIndex,
            });
            return;
          }
        }
      }
    }

    if (issues.length > 0) {
      invalidRows.push({ rowIndex, row, issues });
    } else {
      const regKey = registerNumber.toLowerCase();
      validStudentsMap.set(regKey, {
        id: crypto.randomUUID(),
        registerNumber,
        name,
        branch: branchDisplay,
        semester: semesterDisplay,
        subjectCode: subjectCodeDisplay,
        sourceRow: rowIndex,
      });
    }
  });

  return {
    validStudents: Array.from(validStudentsMap.values()),
    invalidRows,
    duplicateCount,
    missingBranchCount,
    missingSemesterCount,
    missingSubjectCount,
    duplicatePolicy,
  };
}

/**
 * Generates a standard CSV string for downloading candidate error reports (PRD Section 4.2).
 */
export function generateErrorReportCSV(invalidRows: InvalidRecord[]): string {
  const headers = ['Row Number', 'Register Number', 'Name', 'Branch', 'Semester', 'Subject Code', 'Issues'];
  const rows = invalidRows.map((invalid) => {
    const r = invalid.row;
    const issuesJoined = `"${invalid.issues.join('; ').replace(/"/g, '""')}"`;
    return [
      invalid.rowIndex,
      `"${String(r['Register No'] || r['Register Number'] || r['Roll No'] || Object.values(r)[0] || '').replace(/"/g, '""')}"`,
      `"${String(r['Name'] || r['Student Name'] || '').replace(/"/g, '""')}"`,
      `"${String(r['Branch'] || '').replace(/"/g, '""')}"`,
      `"${String(r['Semester'] || '').replace(/"/g, '""')}"`,
      `"${String(r['Subject Code'] || r['SubjectCode'] || '').replace(/"/g, '""')}"`,
      issuesJoined,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Helper to trigger client-side download of the CSV error report.
 */
export function downloadErrorReportCSV(invalidRows: InvalidRecord[], filename = 'candidate_import_errors.csv'): void {
  const csvContent = generateErrorReportCSV(invalidRows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
